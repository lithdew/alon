import { Virtuoso, VirtuosoHandle } from "react-virtuoso";
import Inspector, { chromeLight } from "react-inspector";
import { useRef } from "react";
import { useLogs } from "./Log";
import Convert from "ansi-to-html";
import { useMemo } from "react";

const theme = {
    BASE_FONT_FAMILY: 'Menlo, monospace',
    BASE_FONT_SIZE: '11px',
    BASE_LINE_HEIGHT: 1.2,

    BASE_BACKGROUND_COLOR: 'white',
    BASE_COLOR: 'black',

    OBJECT_PREVIEW_ARRAY_MAX_PROPERTIES: 10,
    OBJECT_PREVIEW_OBJECT_MAX_PROPERTIES: 5,
    OBJECT_NAME_COLOR: 'rgb(136, 19, 145)',
    OBJECT_VALUE_NULL_COLOR: 'rgb(128, 128, 128)',
    OBJECT_VALUE_UNDEFINED_COLOR: 'rgb(128, 128, 128)',
    OBJECT_VALUE_REGEXP_COLOR: 'rgba(28, 0, 207, 0.6)',
    OBJECT_VALUE_STRING_COLOR: 'rgba(28, 0, 207, 0.6)',
    OBJECT_VALUE_SYMBOL_COLOR: 'rgba(28, 0, 207, 0.6)',
    OBJECT_VALUE_NUMBER_COLOR: 'rgb(28, 0, 207)',
    OBJECT_VALUE_BOOLEAN_COLOR: 'rgb(28, 0, 207)',
    OBJECT_VALUE_FUNCTION_PREFIX_COLOR: 'rgb(13, 34, 170)',

    HTML_TAG_COLOR: 'rgb(168, 148, 166)',
    HTML_TAGNAME_COLOR: 'rgb(136, 18, 128)',
    HTML_TAGNAME_TEXT_TRANSFORM: 'lowercase',
    HTML_ATTRIBUTE_NAME_COLOR: 'rgb(153, 69, 0)',
    HTML_ATTRIBUTE_VALUE_COLOR: 'rgb(26, 26, 166)',
    HTML_COMMENT_COLOR: 'rgb(35, 110, 37)',
    HTML_DOCTYPE_COLOR: 'rgb(192, 192, 192)',

    ARROW_COLOR: '#6e6e6e',
    ARROW_MARGIN_RIGHT: 3,
    ARROW_FONT_SIZE: 12,
    ARROW_ANIMATION_DURATION: '0',

    TREENODE_FONT_FAMILY: 'Menlo, monospace',
    TREENODE_FONT_SIZE: '11px',
    TREENODE_LINE_HEIGHT: 1.2,
    TREENODE_PADDING_LEFT: 12,

    TABLE_BORDER_COLOR: '#aaa',
    TABLE_TH_BACKGROUND_COLOR: '#eee',
    TABLE_TH_HOVER_COLOR: 'hsla(0, 0%, 90%, 1)',
    TABLE_SORT_ICON_COLOR: '#6e6e6e',
    TABLE_DATA_BACKGROUND_IMAGE:
        'linear-gradient(to bottom, white, white 50%, rgb(234, 243, 255) 50%, rgb(234, 243, 255))',
    TABLE_DATA_BACKGROUND_SIZE: '128px 32px',
};

export interface Log {
    method: string,
    data: any,
}

export const Message = ({ log }: { log: Log }) => {
    const data = useMemo(() => {
        if (typeof log.data === 'string') {
            return new Convert().toHtml(log.data);
        }
        return log.data;
    }, [log]);

    return (
        <div className="flex py-1 pr-1 border-b gap-2 text-xs whitespace-pre-wrap break-words">
            <div className="w-4 h-4 stroke-current text-blue-700" />
            <div className="whitespace-pre-wrap overflow-x-hidden">
                {
                    typeof log.data === 'string' ?
                        <div dangerouslySetInnerHTML={{ __html: data }} />
                        :
                        // @ts-ignore
                        <Inspector data={data} theme={theme} />
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