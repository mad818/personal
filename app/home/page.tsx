import HomeChat from '@/components/home/HomeChat'
import { PricesLoader, FearGreedLoader, ArticlesLoader } from '@/components/ui/DataLoader'

export default function HomePage() {
  return (
    <>
      <PricesLoader />
      <FearGreedLoader />
      <ArticlesLoader />
      <HomeChat />
    </>
  )
}
