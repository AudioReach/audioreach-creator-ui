import {Outlet} from "react-router-dom"

import {QuiRoot} from "@qui/react"

import {Footer, Navbar} from "~shared/layout"

export default function App() {
  return (
    <QuiRoot>
      <div className="flex flex-1 flex-col">
        <Navbar />
        <div className="flex w-full flex-1">
          <div className="main-content">
            <Outlet />
          </div>
        </div>
        <Footer />
      </div>
    </QuiRoot>
  )
}
