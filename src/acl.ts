import express, { Request, Response } from "express";
import { prisma } from "./prisma";

const app = express();
const PORT = 8082;

app.use(express.json());

const generateToken = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
};

app.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const token = generateToken();

    const user = await prisma.user.create({
      data: {
        name: name || "user_" + Date.now(),
      },
    });

    await prisma.authSession.create({
      data: {
        userId: user.id,
        token: token,
        status: "active",
      },
    });

    res.status(200).json({ token });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/auth/logout", async (req: Request, res: Response) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      res.status(401).json({ error: "Authorization header required" });
      return;
    }

    const token = authorization.replace("Bearer ", "");

    await prisma.authSession.updateMany({
      where: { token: token },
      data: { status: "expired" },
    });

    res.sendStatus(200);
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`ACL Server running on port ${PORT}`);
});
