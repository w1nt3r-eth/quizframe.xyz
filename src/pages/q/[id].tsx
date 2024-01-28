import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import bodyParser from "body-parser";
import { z } from "zod";
import { ImageData, Props } from "../api/og/[props]";
import { Quiz, quizSchema, redis } from "../api/publish";

const schema = z.object({
  index: z.number(),
  score: z.number(),
  selected: z.number().nullable(),
});

type State = z.infer<typeof schema>;

export default function UI({
  image,
  action,
  buttons,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <meta property="og:title" content="Frame" />
        <meta property="og:image" content={image} />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content={image} />
        {buttons.map((button, index) => (
          <meta
            key={button}
            property={`fc:frame:button:${index + 1}`}
            content={button}
          />
        ))}
        <meta property="fc:frame:post_url" content={action} />
      </Head>
      <form
        action={action}
        method="POST"
        className="h-screen w-screen flex flex-col items-center justify-center"
      >
        <img className="max-w-xl h-auto" src={image} />
        <div>
          {buttons.map((button, index) => (
            <button
              key={button}
              type="submit"
              name="buttonIndex"
              value={index + 1}
              className="w-32 h-8 border border-gray-300 shadow-sm rounded-md bg-white text-base font-medium text-gray-700 hover:bg-gray-50"
            >
              {button}
            </button>
          ))}
        </div>
      </form>
    </>
  );
}

export const StateData = {
  serialize: (data: z.infer<typeof schema>) =>
    Buffer.from(JSON.stringify(data)).toString("base64url"),
  parse: (data: any) =>
    schema.parse(JSON.parse(Buffer.from(data, "base64url").toString("utf8"))),
};

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  const proto = ctx.req.headers["x-forwarded-proto"] ?? "http";
  const host = ctx.req.headers["x-forwarded-host"] ?? ctx.req.headers.host;
  const url = new URL(ctx.req.url ?? "/", `${proto}://${host}`);
  const id = z.object({ id: z.string() }).parse(ctx.params);
  const quiz = quizSchema.parse(await redis.get(id.id));

  let state: z.infer<typeof schema> = { index: 0, score: 0, selected: null };
  try {
    state = StateData.parse(url.searchParams.get("state"));
  } catch (e) {}

  let buttonIndex: number | null = null;
  if (ctx.req.method === "POST") {
    for (const parser of [
      bodyParser.json(),
      bodyParser.urlencoded({ extended: false }),
    ]) {
      await new Promise((resolve) => parser(ctx.req, ctx.res, resolve));
    }
    const body = (ctx.req as any).body;
    if (body) {
      buttonIndex = body.buttonIndex
        ? parseInt(body.buttonIndex)
        : body.untrustedData.buttonIndex;
    }
  }

  if (buttonIndex) {
    state = game(quiz, state, buttonIndex);
  }

  const { props, buttons } = render(quiz, state);

  url.searchParams.set(
    "state",
    Buffer.from(JSON.stringify(state)).toString("base64url")
  );

  return {
    props: {
      v: 1,
      image: new URL(`/api/og/${ImageData.serialize(props)}`, url).toString(),
      action: url.toString(),
      buttons,
    },
  };
};

function game(quiz: Quiz, state: State, action: number): State {
  if (state.index === 0) {
    return { ...state, index: 1, selected: null };
  }

  if (state.index > quiz.questions.length) {
    return { index: 0, selected: null, score: 0 };
  }

  if (state.selected == null) {
    return { ...state, selected: action - 1 };
  }

  let score = state.score;
  if (state.selected === quiz.questions[state.index - 1].correct) {
    score++;
  }

  return { index: state.index + 1, selected: null, score };
}

function render(
  quiz: Quiz,
  state: State
): {
  props: Props;
  buttons: string[];
} {
  if (state.index === 0) {
    return {
      props: {
        v: 1,
        state: {
          type: "intro",
          name: quiz.name,
        },
      },
      buttons: ["Start"],
    };
  }

  const question = quiz.questions[state.index - 1];
  if (!question) {
    return {
      props: {
        v: 1,
        state: {
          type: "result",
          win: state.score === quiz.questions.length,
        },
      },
      buttons: ["Play Again"],
    };
  }
  if (state.selected == null) {
    return {
      props: {
        v: 1,
        state: {
          type: "question",
          question: question.question,
          answers: question.answers,
          selection: null,
        },
      },
      buttons: ["A", "B", "C", "D"].slice(0, question.answers.length),
    };
  } else {
    const question = quiz.questions[state.index - 1];
    return {
      props: {
        v: 1,
        state: {
          type: "question",
          question: question.question,
          answers: question.answers,
          selection: {
            selected: state.selected,
            correct: question.correct,
          },
        },
      },
      buttons: ["Continue"],
    };
  }
}
