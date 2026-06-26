import { execSync } from "child_process"

const schema = "apps/api/prisma/schema.prisma"

const out = execSync(`npx prisma validate --schema=${schema}`, {
  stdio: "inherit"
})

process.exit(0)
