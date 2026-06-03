const { PrismaClient } = require("@prisma/client");

(async () => {
  const p = new PrismaClient();
  try {
    const todos = await p.adminTodo.findMany({
      orderBy: { ticketSeq: "asc" }
    });
    console.log(JSON.stringify(todos.map(t => ({
      key: t.ticketKey,
      title: t.title,
      category: t.category,
      priority: t.priority,
      status: t.status
    })), null, 2));
  } finally {
    await p.$disconnect();
  }
})();
