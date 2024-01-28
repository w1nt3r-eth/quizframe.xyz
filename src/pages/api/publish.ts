import { NextApiRequest, NextApiResponse } from "next";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { randomUUID } from "crypto";

export const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

const questionSchema = z.object({
  question: z.string().min(1).max(100),
  answers: z.array(z.string().max(50)).length(4),
  correct: z.number().min(0).max(3),
});

export const quizSchema = z.object({
  name: z.string().min(1).max(100),
  questions: z.array(questionSchema),
});

export type Quiz = z.infer<typeof quizSchema>;
export type PublishRequest = Quiz;
export type Question = z.infer<typeof questionSchema>;
export type PublishResponse = { id: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PublishResponse>
) {
  const id = randomUUID();
  const body = quizSchema.parse(req.body);

  await redis.set(id, JSON.stringify(body));

  res.status(200).json({ id });
}
