import AgentOffice from '@/components/home/AgentOffice'
import { PricesLoader, FearGreedLoader, ArticlesLoader } from '@/components/ui/DataLoader'

export default function HomePage() {
  return (
    <>
      <PricesLoader />
      <FearGreedLoader />
      <ArticlesLoader />
      <AgentOffice />
    </>
  )
}
