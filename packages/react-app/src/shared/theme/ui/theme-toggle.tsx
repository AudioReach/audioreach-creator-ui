import type {ReactNode} from "react"

import {Moon, Sun} from "lucide-react"

import {QIconButton} from "@qui/react"

import {useTheme} from "../model"

export function ThemeToggle(): ReactNode {
  const {mode, toggleMode} = useTheme()

  return (
    <QIconButton icon={mode === "light" ? Sun : Moon} onClick={toggleMode} />
  )
}
