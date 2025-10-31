import {useRef, useState} from "react"

import {Database} from "lucide-react"

import {
  QAvatar,
  QBadge,
  QCard,
  QCardAdornment,
  QCardContent,
  QCardDescription,
  QCardMedia,
  QCardSubtitle,
  QCardTitle,
  QMenu,
} from "@qui/react"

import qcLogoImg from "~assets/graph-view-screenshot.png" // todo: REMOVE THIS AND REPLACE WITH imgSource from ArcProjectCardProps when we support getting the image of the graph view

export interface ArcProjectCardProps {
  /** A short description */
  description: string
  /** The image to display in the project card */
  imgSource?: string
  /** Indicates if the project activly open on the server. */
  isActive: boolean
  /** A label displayed at the top right area of the card */
  label?: string
  /** The date of when a project was last modified */
  lastModifiedDate?: Date
  /** A callback thats called when a card is double-clicked */
  onDoubleClick?: () => void
  /** Callback when user selects to remove item from the recent files */
  onRemoveFromRecent?: () => void
  /** Show the selected project in the file explorer */
  onShowInExplorer?: () => Promise<void>
  /** The title of the card */
  title: string
}

export default function ArcProjectCard({
  description,
  isActive = false,
  label,
  lastModifiedDate,
  onDoubleClick,
  onRemoveFromRecent,
  onShowInExplorer,
  title,
}: ArcProjectCardProps) {
  // State for context menu
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
  const cardRef = useRef(null)

  function getTimeStampMesage(): string {
    // If no lastModifiedDate is provided, return a default message
    if (!lastModifiedDate) {
      return "No edit date"
    }

    const currentDate = new Date()

    // Calculate the difference in milliseconds
    const diffMs = currentDate.getTime() - lastModifiedDate.getTime()

    // Convert to days
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    // If it's today, show hours
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        // If less than an hour, show minutes
        const diffMinutes = Math.floor(diffMs / (1000 * 60))
        return `Edited ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
      }
      return `Edited ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
    }

    // Check if it's within the last week
    if (diffDays < 7) {
      return `Edited ${diffDays} day${diffDays === 1 ? "" : "s"} ago`
    }

    // Check if it's within the last year
    const diffWeeks = Math.floor(diffDays / 7)
    if (diffWeeks < 52) {
      return `Edited ${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ago`
    }

    // It's more than a year ago
    const diffYears = Math.floor(diffDays / 365)
    return `Edited ${diffYears} year${diffYears === 1 ? "" : "s"} ago`
  }

  function handleDoubleClick() {
    if (onDoubleClick === undefined) {
      console.log("onDoubleClick needs to be provided to ArcCard")
    }

    onDoubleClick?.()
  }

  function handleMouseDown(e: React.MouseEvent) {
    switch (e.button) {
      case 2: // Right Click
        // Prevent default context menu
        e.preventDefault()

        setIsContextMenuOpen(true)
        break
    }
  }

  function handleRemoveFromRecent() {
    if (onRemoveFromRecent) {
      onRemoveFromRecent()
    }
    setIsContextMenuOpen(false)
  }

  async function handleShowInExplorer() {
    await onShowInExplorer?.()
  }

  return (
    <div>
      <QCard
        ref={cardRef}
        alignment="left"
        className="hover:border-focus h-full max-w-[350px] grow rounded-xl hover:border-2"
        elevation={0}
        onDoubleClick={handleDoubleClick}
        onMouseDown={(e) => {
          handleMouseDown(e)
        }}
      >
        <QCardMedia
          alt="Auto"
          as="img"
          height={160}
          src={qcLogoImg}
          width="400"
        />

        {label !== undefined && (
          <QCardAdornment placement="top-right-outer">
            <QBadge color="yellow">{label}</QBadge>
          </QCardAdornment>
        )}

        <QCardContent className="flex flex-row">
          <div className="flex grow flex-col gap-2">
            <QCardTitle>{title}</QCardTitle>
            <QCardSubtitle>{description}</QCardSubtitle>
            {lastModifiedDate && (
              <QCardDescription>{getTimeStampMesage()}</QCardDescription>
            )}
          </div>

          <QAvatar
            className="place-self-center"
            color={isActive ? "kiwi" : "neutral"}
            icon={Database}
            shape="square"
            size="l"
            variant="icon"
          />
        </QCardContent>
      </QCard>

      <QMenu
        anchor={cardRef}
        items={[
          {
            id: "removeRecentsMenuItem",
            label: "Remove from recent",
            render: <button onClick={handleRemoveFromRecent}></button>,
          },
          {
            id: "openContainingFolderMenuItem",
            label: "Show in explorer",
            render: <button onClick={handleShowInExplorer}></button>,
          },
        ]}
        offset={{alignmentAxis: 0, crossAxis: 0, mainAxis: 0}}
        onOpenChange={(value: boolean) => {
          setIsContextMenuOpen(value)
        }}
        open={isContextMenuOpen}
        placement="bottom-start"
      />
    </div>
  )
}
