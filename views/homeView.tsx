import { Button } from '@/components/ui/button'
import React from 'react'

const HomeView = () => {
  return (
   <>
      <div>
        <h1 className="font-medium">Project ready!</h1>
        <p>You may now add components and start building.</p>
        <p>We&apos;ve already added the button component for you.</p>
        <Button className="mt-2">Button</Button>
      </div>
      <div className="font-mono text-xs text-muted-foreground">
        (Press <kbd>d</kbd> to toggle dark mode)
      </div>
    </>
  )
}

export default HomeView