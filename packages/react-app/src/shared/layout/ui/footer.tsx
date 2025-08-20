import type {ReactNode} from "react"

import {QDivider} from "@qui/react"

import qcLogoImg from "~assets/qualcomm_logo.png"

export function Footer(): ReactNode {
  const qcLogo = <img alt="Qualcomm Logo" src={qcLogoImg} width="100" />
  return (
    <div className="q-border-subtle q-background-2 flex flex-col gap-5 border-t-[1px]">
      <div className="q-text-1-secondary q-body-xxs flex gap-2.5">
        <div className="ml-auto flex">
          <div className="q-font-body-md p-1.5">
            © 2025 Qualcomm Technologies, Inc. and/or its affiliated companies
          </div>
          <QDivider orientation="vertical" spacingBefore={10} />
          <div className="ml-auto mr-auto">{qcLogo}</div>
        </div>
      </div>
    </div>
  )
}
