import {OpenFile} from "~features/open-file"
import {RecentFiles} from "~features/recent-files"

export const StartPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">Start Page</h1>
      <p className="mb-4 text-sm text-gray-500">Placeholder</p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 text-sm font-medium">Open Project</h2>
          <OpenFile />
        </div>

        <div>
          <h2 className="mb-2 text-sm font-medium">Recent Projects</h2>
          <RecentFiles />
        </div>
      </div>
    </div>
  )
}
