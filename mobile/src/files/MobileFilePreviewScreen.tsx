import { MobileChatAttachmentPreview } from './attachments/MobileChatAttachmentPreview'
import { useWorkspaceExecutionHost } from '../navigation/workspace-execution-host'
import type { MobileFilePreviewRouteState } from './preview/mobile-file-preview-route'
import { previewSourceFromRoute, sourceKeyForPreview } from './preview/mobile-file-preview-source'
import { MobileFilePreviewDocument } from './MobileFilePreviewDocument'

type Props = {
  route: MobileFilePreviewRouteState
}

export const MobileFilePreviewScreen = ({ route }: Props) =>
  route.ok && route.params.source === 'chatAttachment' ? (
    <MobileChatAttachmentPreview key={JSON.stringify(route.params)} params={route.params} />
  ) : (
    <WorkspaceFilePreviewScreen route={route} />
  )

function WorkspaceFilePreviewScreen({ route }: Props) {
  const executionHost = useWorkspaceExecutionHost()
  const documentKey = route.ok
    ? [
        route.params.hostId,
        executionHost,
        sourceKeyForPreview(previewSourceFromRoute(route.params))
      ]
    : ['invalid', route.message]
  return <MobileFilePreviewDocument key={JSON.stringify(documentKey)} route={route} />
}
