import { useAsync } from "react-use";
import Parser from "web-tree-sitter";

export const useLanguageParser = (languagePath: string) => {
    const state = useAsync(async () => {
        await Parser.init();

        const language = await Parser.Language.load(languagePath);

        const parser = new Parser();
        parser.setLanguage(language);
        return parser;
    }, [languagePath]);

    if (state.loading) return null;
    if (!state.value) return null;
    return state.value;
}