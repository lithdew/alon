import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import Inspector from "react-inspector";
import { useRef } from "react";
import { useLogs } from "./Log";

export interface Log {
    method: string,
    data: any,
}

export const Message = ({ log }: { log: Log }) => {
    return (
        <div className="flex py-1 pr-1 border-b gap-2 text-xs whitespace-pre-wrap break-words">
            <div className="w-4 h-4 stroke-current text-blue-700" />
            <div className="whitespace-pre-wrap overflow-x-hidden">
                {
                    typeof log.data === 'string' ?
                        <div dangerouslySetInnerHTML={{ __html: log.data }} />
                        :
                        <Inspector data={log.data} />
                }
            </div>
        </div>
    )
}

const Console = ({ scope }: { scope: string }) => {
    const virtuoso = useRef<VirtuosoHandle>(null);
    const log = useLogs();

    return (
        <Virtuoso
            ref={virtuoso}
            data={log.get(scope)}
            followOutput={(isAtBottom: boolean) => {
                // if (isAtBottom) {
                return true;
                // }
                // return false;
            }}
            className="border-t h-full scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
            itemContent={(_, log) => {
                return (
                    <Message log={log} />
                );
            }}
        />
    )
}

export default Console;