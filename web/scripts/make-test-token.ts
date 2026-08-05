import { encode } from "next-auth/jwt";
import { config } from "dotenv";
import prisma from "../db/index";

config();

const email = "post-test@toolkit.dev";
let user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  user = await prisma.user.create({ data: { email, name: "Post Test", tag: "posttest" } });
}

const token = await encode({
  token: { id: user.id, email: user.email, sub: user.id },
  secret: process.env.NEXTAUTH_SECRET!,
});

console.log(`USER_ID=${user.id}`);
console.log(`TOKEN=${token}`);
