/**
 * One-time helper to apply the pipeline staff_id migration safely on an existing DB.
 * Uses `prisma db push` for schema sync, then backfills staff_id for projects/stages.
 *
 * Run:
 *   node scripts/apply-pipeline-tenant-scope.js
 */

const { PrismaClient, Prisma } = require('@prisma/client')

const db = new PrismaClient()

async function main() {
  // Ensure columns exist (db push was already used in this repo)
  console.log('Backfilling projects.staff_id and pipeline_stages.staff_id...')

  // Projects from appointment services
  await db.$executeRaw(Prisma.sql`
    UPDATE projects p
    SET staff_id = COALESCE(u.owner_user_id, u.id)
    FROM appointment_services aps
    JOIN appointments a ON a.id = aps.appointment_id
    JOIN users u ON u.id = a.staff_id
    WHERE p.appointment_service_id = aps.id
      AND p.staff_id IS NULL
  `)

  // Remaining projects from any task staff id
  await db.$executeRaw(Prisma.sql`
    UPDATE projects p
    SET staff_id = COALESCE(u.owner_user_id, u.id)
    FROM tasks t
    JOIN users u ON u.id = t.staff_id
    WHERE t.project_id = p.id
      AND p.staff_id IS NULL
  `)

  // Stages where consistent
  await db.$executeRaw(Prisma.sql`
    UPDATE pipeline_stages s
    SET staff_id = x.staff_id
    FROM (
      SELECT stage_id, MIN(staff_id) AS staff_id
      FROM projects
      WHERE staff_id IS NOT NULL
      GROUP BY stage_id
      HAVING COUNT(DISTINCT staff_id) = 1
    ) x
    WHERE s.id = x.stage_id
      AND s.staff_id IS NULL
  `)

  const remainingStages = await db.$queryRaw(Prisma.sql`
    SELECT COUNT(*)::bigint AS c FROM pipeline_stages WHERE staff_id IS NULL
  `)
  console.log('Stages still unscoped:', remainingStages?.[0]?.c?.toString?.() ?? remainingStages)

  const remainingProjects = await db.$queryRaw(Prisma.sql`
    SELECT COUNT(*)::bigint AS c FROM projects WHERE staff_id IS NULL
  `)
  console.log('Projects still unscoped:', remainingProjects?.[0]?.c?.toString?.() ?? remainingProjects)

  console.log('Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })

