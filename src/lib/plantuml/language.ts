import type { Monaco } from "@monaco-editor/react";

export function registerPlantUMLLanguage(monaco: Monaco) {
  // Register the language
  monaco.languages.register({ id: "plantuml" });

  // Define tokens
  monaco.languages.setMonarchTokensProvider("plantuml", {
    keywords: [
      "class", "interface", "abstract", "enum", "entity", "actor",
      "usecase", "component", "package", "node", "folder", "frame",
      "cloud", "database", "storage", "artifact", "card", "queue",
      "stack", "rectangle", "hexagon", "person", "boundary", "control",
      "collections", "participant", "state", "note", "legend",
    ],

    directives: [
      "@startuml", "@enduml", "@startmindmap", "@endmindmap",
      "@startwbs", "@endwbs", "@startgantt", "@endgantt",
      "@startjson", "@endjson", "@startyaml", "@endyaml",
      "@startsalt", "@endsalt",
    ],

    modifiers: [
      "public", "private", "protected", "static", "abstract",
      "as", "extends", "implements", "import",
    ],

    arrows: [
      "-->", "<--", "->", "<-", ".>", "<.", "..>", "<..",
      "->>", "<<-", "--|>", "<|--", "..|>", "<|..",
      "--", "..", "~~", "==",
    ],

    skinparams: [
      "skinparam", "style", "hide", "show", "remove",
      "title", "header", "footer", "caption", "scale",
      "left to right direction", "top to bottom direction",
    ],

    colors: [
      "red", "green", "blue", "yellow", "orange", "purple",
      "pink", "cyan", "white", "black", "gray", "grey",
    ],

    tokenizer: {
      root: [
        // Comments
        [/'.*$/, "comment"],
        [/\/\'/, "comment", "@comment"],

        // Directives
        [/@\w+/, {
          cases: {
            "@directives": "keyword.directive",
            "@default": "identifier",
          },
        }],

        // Strings
        [/"[^"]*"/, "string"],

        // Keywords
        [/\b\w+\b/, {
          cases: {
            "@keywords": "keyword",
            "@modifiers": "keyword.modifier",
            "@skinparams": "keyword.skinparam",
            "@colors": "constant.color",
            "@default": "identifier",
          },
        }],

        // Arrows and relations
        [/[-.<>=~|]+>/, "operator.arrow"],
        [/<[-.<>=~|]+/, "operator.arrow"],
        [/[-.<>=~]{2,}/, "operator.arrow"],

        // Stereotypes
        [/<<\w+>>/, "type.stereotype"],

        // Visibility modifiers
        [/[+\-#~](?=\w)/, "keyword.visibility"],

        // Brackets
        [/[{}()\[\]]/, "delimiter.bracket"],

        // Numbers
        [/\d+/, "number"],

        // Colon (for types)
        [/:/, "delimiter"],
      ],

      comment: [
        [/[^']+/, "comment"],
        [/\'\//, "comment", "@pop"],
        [/'/, "comment"],
      ],
    },
  });

  // Define language configuration
  monaco.languages.setLanguageConfiguration("plantuml", {
    comments: {
      lineComment: "'",
      blockComment: ["/'", "'/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "<<", close: ">>" },
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
    ],
  });

  // Register completions
  monaco.languages.registerCompletionItemProvider("plantuml", {
    triggerCharacters: ["@", " "],
    provideCompletionItems: (model: any, position: any) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      // All PlantUML keywords for autocomplete
      const allKeywords = [
        // Diagram types (snippets)
        { label: "@startuml", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "@startuml\n$0\n@enduml", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Start UML diagram" },
        { label: "@startmindmap", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "@startmindmap\n$0\n@endmindmap", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Start mind map" },
        { label: "@startwbs", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "@startwbs\n$0\n@endwbs", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Start WBS diagram" },
        { label: "@startgantt", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "@startgantt\n$0\n@endgantt", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Start Gantt chart" },
        { label: "@startjson", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "@startjson\n$0\n@endjson", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Start JSON diagram" },
        { label: "@startyaml", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "@startyaml\n$0\n@endyaml", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Start YAML diagram" },
        { label: "@startsalt", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "@startsalt\n$0\n@endsalt", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Start Salt wireframe" },

        // Class diagram elements
        { label: "class", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "class ${1:ClassName} {\n  $0\n}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a class" },
        { label: "interface", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "interface ${1:InterfaceName} {\n  $0\n}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define an interface" },
        { label: "abstract", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "abstract class ${1:ClassName} {\n  $0\n}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define an abstract class" },
        { label: "enum", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "enum ${1:EnumName} {\n  $0\n}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define an enumeration" },
        { label: "entity", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "entity ${1:EntityName} {\n  $0\n}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define an entity (ER diagram)" },

        // Use case elements
        { label: "actor", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "actor ${1:ActorName}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define an actor" },
        { label: "usecase", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "usecase \"${1:Use Case}\" as ${2:UC1}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a use case" },
        { label: "boundary", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "boundary ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a boundary" },
        { label: "control", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "control ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a control" },

        // Sequence diagram elements
        { label: "participant", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "participant ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a participant" },
        { label: "collections", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "collections ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a collections participant" },
        { label: "activate", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "activate ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Activate lifeline" },
        { label: "deactivate", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "deactivate ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Deactivate lifeline" },
        { label: "destroy", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "destroy ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Destroy participant" },
        { label: "return", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "return ${1:message}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Return message" },
        { label: "create", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "create ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Create participant" },
        { label: "alt", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "alt ${1:condition}\n  $0\nend", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Alternative fragment" },
        { label: "else", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "else ${1:condition}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Else branch" },
        { label: "opt", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "opt ${1:condition}\n  $0\nend", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Optional fragment" },
        { label: "loop", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "loop ${1:condition}\n  $0\nend", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Loop fragment" },
        { label: "par", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "par\n  $0\nend", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Parallel fragment" },
        { label: "break", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "break ${1:condition}\n  $0\nend", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Break fragment" },
        { label: "critical", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "critical\n  $0\nend", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Critical region" },
        { label: "group", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "group ${1:label}\n  $0\nend", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Group fragment" },
        { label: "ref", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "ref over ${1:participants}: ${2:description}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Reference fragment" },

        // Component diagram elements
        { label: "component", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "component ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a component" },
        { label: "package", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "package ${1:Name} {\n  $0\n}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a package" },
        { label: "node", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "node ${1:Name} {\n  $0\n}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a node" },
        { label: "folder", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "folder ${1:Name} {\n  $0\n}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a folder" },
        { label: "frame", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "frame ${1:Name} {\n  $0\n}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a frame" },
        { label: "cloud", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "cloud ${1:Name} {\n  $0\n}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a cloud" },
        { label: "database", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "database ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a database" },
        { label: "storage", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "storage ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a storage" },
        { label: "artifact", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "artifact ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define an artifact" },
        { label: "card", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "card ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a card" },
        { label: "queue", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "queue ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a queue" },
        { label: "stack", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "stack ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a stack" },
        { label: "rectangle", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "rectangle ${1:Name} {\n  $0\n}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a rectangle" },
        { label: "hexagon", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "hexagon ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a hexagon" },
        { label: "person", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "person ${1:Name}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a person" },

        // State diagram elements
        { label: "state", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "state ${1:StateName}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Define a state" },
        { label: "[*]", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "[*]", detail: "Initial/final state" },

        // Activity diagram elements
        { label: "start", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "start", detail: "Start point" },
        { label: "stop", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "stop", detail: "Stop point" },
        { label: "end", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "end", detail: "End point" },
        { label: "if", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "if (${1:condition}) then (${2:yes})\n  $0\nelse (${3:no})\nendif", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "If-then-else" },
        { label: "while", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "while (${1:condition})\n  $0\nendwhile", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "While loop" },
        { label: "repeat", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "repeat\n  $0\nrepeat while (${1:condition})", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Repeat-while loop" },
        { label: "fork", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "fork\n  $0\nfork again\n  \nend fork", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Fork/join" },
        { label: "split", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "split\n  $0\nsplit again\n  \nend split", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Split" },
        { label: "partition", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "partition ${1:Name} {\n  $0\n}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Partition (swimlane)" },
        { label: "detach", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "detach", detail: "Detach flow" },
        { label: "kill", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "kill", detail: "Kill flow" },

        // Notes and labels
        { label: "note", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "note ${1|left,right,top,bottom|}: ${2:text}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Add a note" },
        { label: "note left", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "note left: ${1:text}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Note on left" },
        { label: "note right", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "note right: ${1:text}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Note on right" },
        { label: "note top", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "note top: ${1:text}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Note on top" },
        { label: "note bottom", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "note bottom: ${1:text}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Note on bottom" },
        { label: "note over", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "note over ${1:participant}: ${2:text}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Note over participant" },
        { label: "legend", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "legend ${1|left,right,center|}\n  $0\nendlegend", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Add a legend" },

        // Layout and style
        { label: "skinparam", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "skinparam ${1:parameter} ${2:value}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Set skin parameter" },
        { label: "hide", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "hide ${1:element}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Hide element" },
        { label: "show", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "show ${1:element}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Show element" },
        { label: "remove", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "remove ${1:element}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Remove element" },
        { label: "title", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "title ${1:Title}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Set diagram title" },
        { label: "header", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "header ${1:text}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Set header" },
        { label: "footer", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "footer ${1:text}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Set footer" },
        { label: "caption", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "caption ${1:text}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Set caption" },
        { label: "scale", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "scale ${1:factor}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Set scale" },
        { label: "left to right direction", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "left to right direction", detail: "Layout left to right" },
        { label: "top to bottom direction", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "top to bottom direction", detail: "Layout top to bottom" },

        // Modifiers
        { label: "as", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "as ${1:alias}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Create alias" },
        { label: "extends", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "extends ${1:Parent}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Extend class" },
        { label: "implements", kind: monaco.languages.CompletionItemKind.Keyword, insertText: "implements ${1:Interface}", insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, detail: "Implement interface" },

        // Arrows
        { label: "-->", kind: monaco.languages.CompletionItemKind.Operator, insertText: "-->", detail: "Solid arrow" },
        { label: "<--", kind: monaco.languages.CompletionItemKind.Operator, insertText: "<--", detail: "Reverse solid arrow" },
        { label: "->", kind: monaco.languages.CompletionItemKind.Operator, insertText: "->", detail: "Short solid arrow" },
        { label: "<-", kind: monaco.languages.CompletionItemKind.Operator, insertText: "<-", detail: "Reverse short arrow" },
        { label: ".>", kind: monaco.languages.CompletionItemKind.Operator, insertText: ".>", detail: "Short dotted arrow" },
        { label: "<.", kind: monaco.languages.CompletionItemKind.Operator, insertText: "<.", detail: "Reverse short dotted" },
        { label: "..>", kind: monaco.languages.CompletionItemKind.Operator, insertText: "..>", detail: "Dotted arrow" },
        { label: "<..", kind: monaco.languages.CompletionItemKind.Operator, insertText: "<..", detail: "Reverse dotted arrow" },
        { label: "--|>", kind: monaco.languages.CompletionItemKind.Operator, insertText: "--|>", detail: "Inheritance arrow" },
        { label: "<|--", kind: monaco.languages.CompletionItemKind.Operator, insertText: "<|--", detail: "Reverse inheritance" },
        { label: "..|>", kind: monaco.languages.CompletionItemKind.Operator, insertText: "..|>", detail: "Implementation arrow" },
        { label: "<|..", kind: monaco.languages.CompletionItemKind.Operator, insertText: "<|..", detail: "Reverse implementation" },
        { label: "--", kind: monaco.languages.CompletionItemKind.Operator, insertText: "--", detail: "Solid line" },
        { label: "..", kind: monaco.languages.CompletionItemKind.Operator, insertText: "..", detail: "Dotted line" },
        { label: "o--", kind: monaco.languages.CompletionItemKind.Operator, insertText: "o--", detail: "Aggregation" },
        { label: "*--", kind: monaco.languages.CompletionItemKind.Operator, insertText: "*--", detail: "Composition" },

        // Colors (for skinparam)
        { label: "#red", kind: monaco.languages.CompletionItemKind.Color, insertText: "#red", detail: "Red color" },
        { label: "#green", kind: monaco.languages.CompletionItemKind.Color, insertText: "#green", detail: "Green color" },
        { label: "#blue", kind: monaco.languages.CompletionItemKind.Color, insertText: "#blue", detail: "Blue color" },
        { label: "#yellow", kind: monaco.languages.CompletionItemKind.Color, insertText: "#yellow", detail: "Yellow color" },
        { label: "#orange", kind: monaco.languages.CompletionItemKind.Color, insertText: "#orange", detail: "Orange color" },
        { label: "#purple", kind: monaco.languages.CompletionItemKind.Color, insertText: "#purple", detail: "Purple color" },
        { label: "#pink", kind: monaco.languages.CompletionItemKind.Color, insertText: "#pink", detail: "Pink color" },
        { label: "#cyan", kind: monaco.languages.CompletionItemKind.Color, insertText: "#cyan", detail: "Cyan color" },
        { label: "#white", kind: monaco.languages.CompletionItemKind.Color, insertText: "#white", detail: "White color" },
        { label: "#black", kind: monaco.languages.CompletionItemKind.Color, insertText: "#black", detail: "Black color" },
        { label: "#gray", kind: monaco.languages.CompletionItemKind.Color, insertText: "#gray", detail: "Gray color" },
        { label: "#lightblue", kind: monaco.languages.CompletionItemKind.Color, insertText: "#lightblue", detail: "Light blue color" },
        { label: "#lightgreen", kind: monaco.languages.CompletionItemKind.Color, insertText: "#lightgreen", detail: "Light green color" },
      ];

      return {
        suggestions: allKeywords.map((s) => ({ ...s, range })),
      };
    },
  });
}
