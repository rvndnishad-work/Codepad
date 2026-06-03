const { PrismaClient } = require("@prisma/client");

(async () => {
  const p = new PrismaClient();
  try {
    // Mark IP-18 as DONE
    await p.adminTodo.update({
      where: { ticketKey: "IP-18" },
      data: { status: "DONE", completedAt: new Date() }
    });
    // Mark IP-19 as IN_PROGRESS
    await p.adminTodo.update({
      where: { ticketKey: "IP-19" },
      data: { status: "IN_PROGRESS" }
    });
    console.log("Updated database ticket statuses!");
  } finally {
    await p.$disconnect();
  }
})();
