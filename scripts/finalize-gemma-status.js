const { PrismaClient } = require("@prisma/client");

(async () => {
  const p = new PrismaClient();
  try {
    const keys = ["IP-17", "IP-18", "IP-19", "IP-20", "IP-21", "IP-22"];
    
    for (const key of keys) {
      await p.adminTodo.update({
        where: { ticketKey: key },
        data: { 
          status: "DONE", 
          completedAt: new Date() 
        }
      });
      console.log(`Marked ${key} as DONE!`);
    }
    console.log("Successfully finalized all Gemma RAG Copilot tickets!");
  } finally {
    await p.$disconnect();
  }
})();
