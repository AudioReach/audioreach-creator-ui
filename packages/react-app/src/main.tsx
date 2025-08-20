import {routes} from "@generouted/react-router"
import {createRoot} from "react-dom/client"
import {createHashRouter, RouterProvider} from "react-router-dom"

import "./index.css"

const router = createHashRouter(routes, {basename: "/"})
const Routes = () => <RouterProvider router={router} />

createRoot(document.getElementById("root")!).render(<Routes />)
