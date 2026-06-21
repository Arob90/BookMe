-- Add tenant scoping to pipeline stages + projects

-- AlterTable
ALTER TABLE "pipeline_stages" ADD COLUMN "staff_id" TEXT;
ALTER TABLE "projects" ADD COLUMN "staff_id" TEXT;

-- Backfill project staff_id from linked appointment staff → business owner
-- If appointment.staff_id is a team member, map to their owner_user_id.
UPDATE projects p
SET staff_id = COALESCE(u.owner_user_id, u.id)
FROM appointment_services aps
JOIN appointments a ON a.id = aps.appointment_id
JOIN users u ON u.id = a.staff_id
WHERE p.appointment_service_id = aps.id
  AND p.staff_id IS NULL;

-- Backfill remaining projects from any task staff_id → business owner
UPDATE projects p
SET staff_id = COALESCE(u.owner_user_id, u.id)
FROM tasks t
JOIN users u ON u.id = t.staff_id
WHERE t.project_id = p.id
  AND p.staff_id IS NULL;

-- Backfill stages based on their projects when consistent
-- If a stage has projects for exactly one staff_id, assign that staff_id.
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
  AND s.staff_id IS NULL;

-- Indexes
CREATE INDEX "pipeline_stages_staff_id_idx" ON "pipeline_stages"("staff_id");
CREATE INDEX "projects_staff_id_idx" ON "projects"("staff_id");

