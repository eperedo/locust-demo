import express, { Request, Response, NextFunction } from "express";
import { prisma } from "./prisma";

const app = express();
const PORT = 8081;

app.use(express.json());

interface AuthRequest extends Request {
  userId?: string;
}

const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    res.status(401).json({ error: "Authorization header required" });
    return;
  }

  const token = authorization.replace("Bearer ", "");

  try {
    // Buscar sesión activa
    const session = await prisma.authSession.findFirst({
      where: {
        token: token,
        status: "active",
      },
    });

    if (!session) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.userId = session.userId;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

app.post(
  "/customer",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const { name } = req.body;

      const customer = await prisma.customer.create({
        data: {
          name: name || "customer_" + Date.now(),
          userId: req.userId!,
        },
      });

      res.status(201).json({ id: customer.id });
    } catch (error) {
      console.error("Create customer error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.get(
  "/customers",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const customers = await prisma.customer.findMany({
        where: { userId: req.userId },
        orderBy: { id: "desc" },
        take: 10,
        select: { id: true },
      });

      res.status(200).json(customers);
    } catch (error) {
      console.error("Get customers error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

app.post("/sales", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { customer_id } = req.body;

    const sale = await prisma.sale.create({
      data: {
        customerId: customer_id,
        userId: req.userId!,
      },
    });

    res.status(201).json({ id: sale.id });
  } catch (error) {
    console.error("Create sale error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
