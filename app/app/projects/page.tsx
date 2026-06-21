import { AppTopbar } from '@/components/app-topbar'
import { ProjectsPipeline } from '@/components/projects-pipeline'
import { getPipelineStages, getPipelineStaffOptions } from '@/app/actions/projects'
import { getClients } from '@/app/actions/clients'
import { getServices } from '@/app/actions/services'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [stages, staffOptions, clients, services] = await Promise.all([
    getPipelineStages(),
    getPipelineStaffOptions(),
    getClients(),
    getServices(false, true),
  ])
  const firstStageId = stages[0]?.id

  return (
    <div className="flex flex-col h-full">
      <AppTopbar title="Pipeline" />
      <div className="flex-1 overflow-hidden p-4 bg-transparent">
        <ProjectsPipeline
          initialStages={stages}
          firstStageId={firstStageId}
          staffOptions={staffOptions}
          clients={clients}
          services={services}
        />
      </div>
    </div>
  )
}

