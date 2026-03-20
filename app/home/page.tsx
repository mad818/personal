'use client'

import HomeChat from '@/components/home/HomeChat'
import { PricesLoader, FearGreedLoader, ArticlesLoader } from '@/components/ui/DataLoader'
import PageTransition from '@/components/ui/PageTransition'

export default function HomePage() {
  return (
    <PageTransition>
      <>
        <PricesLoader />
        <FearGreedLoader />
        <ArticlesLoader />
        <HomeChat />
      </>
    </PageTransition>
  )
}
