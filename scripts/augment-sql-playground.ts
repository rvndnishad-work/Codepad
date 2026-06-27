import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Augmenting SQL questions with interactive playgrounds...");

  // 1. What is a self join?
  const qSelfJoin = await prisma.prepQuestion.findUnique({
    where: { slug: "what-is-a-self-join" },
  });

  if (qSelfJoin) {
    await prisma.prepQuestion.update({
      where: { id: qSelfJoin.id },
      data: {
        description: 
          "Explain self joins. A self join is a regular join, but the table is joined with itself.\n\n" +
          "Here is the schema for our `employees` table:\n" +
          "```sql\n" +
          "CREATE TABLE employees (\n" +
          "  id INT PRIMARY KEY,\n" +
          "  name VARCHAR(50),\n" +
          "  manager_id INT\n" +
          ");\n" +
          "INSERT INTO employees VALUES (1, 'Alice', NULL);\n" +
          "INSERT INTO employees VALUES (2, 'Bob', 1);\n" +
          "INSERT INTO employees VALUES (3, 'Charlie', 1);\n" +
          "INSERT INTO employees VALUES (4, 'David', 2);\n" +
          "```",
        examplesData: JSON.stringify([
          {
            label: "Self Join Example",
            code: 
              "-- Match each employee to their manager\n" +
              "SELECT \n" +
              "  e.name AS employee_name,\n" +
              "  m.name AS manager_name\n" +
              "FROM employees e\n" +
              "JOIN employees m ON e.manager_id = m.id;"
          }
        ])
      }
    });
    console.log("Successfully augmented 'What is a self join?' with SQL playground.");
  } else {
    console.log("Could not find question 'what-is-a-self-join' in the DB.");
  }

  // 2. What is the difference between WHERE and HAVING?
  const qWhereHaving = await prisma.prepQuestion.findUnique({
    where: { slug: "what-is-the-difference-between-where-and-having" },
  });

  if (qWhereHaving) {
    await prisma.prepQuestion.update({
      where: { id: qWhereHaving.id },
      data: {
        description:
          "Compare WHERE and HAVING clauses. WHERE filters rows before grouping; HAVING filters groups after GROUP BY.\n\n" +
          "Here is the schema for our `sales` table:\n" +
          "```sql\n" +
          "CREATE TABLE sales (\n" +
          "  id INT PRIMARY KEY,\n" +
          "  product VARCHAR(50),\n" +
          "  amount INT\n" +
          ");\n" +
          "INSERT INTO sales VALUES (1, 'Apple', 100);\n" +
          "INSERT INTO sales VALUES (2, 'Apple', 150);\n" +
          "INSERT INTO sales VALUES (3, 'Banana', 50);\n" +
          "INSERT INTO sales VALUES (4, 'Banana', 75);\n" +
          "INSERT INTO sales VALUES (5, 'Apple', 200);\n" +
          "```",
        examplesData: JSON.stringify([
          {
            label: "WHERE vs HAVING Example",
            code:
              "-- Filter for products with total sales > 150\n" +
              "SELECT product, SUM(amount) AS total_sales\n" +
              "FROM sales\n" +
              "GROUP BY product\n" +
              "HAVING SUM(amount) > 150;"
          }
        ])
      }
    });
    console.log("Successfully augmented 'What is the difference between WHERE and HAVING?' with SQL playground.");
  } else {
    console.log("Could not find question 'what-is-the-difference-between-where-and-having' in the DB.");
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
