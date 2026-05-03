export const customSnippets = [
  {
    label: 'rafce',
    insertText: [
      'import React from "react";',
      '',
      'export default function ${1:ComponentName}() {',
      '  return (',
      '    <div>',
      '      ${2}',
      '    </div>',
      '  );',
      '}'
    ].join('\n'),
    documentation: 'React Functional Component Export',
  },
  {
    label: 'useState',
    insertText: 'const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initialState});',
    cm6InsertText: 'const [${1:state}, set${2:State}] = useState(${3:initialState});', // CM6 fallback because it lacks advanced regex transforms
    documentation: 'React useState Hook',
  },
  {
    label: 'useEffect',
    insertText: [
      'useEffect(() => {',
      '  ${1}',
      '  return () => {',
      '    ${2}',
      '  };',
      '}, [${3}]);'
    ].join('\n'),
    documentation: 'React useEffect Hook',
  },
  {
    label: 'useRef',
    insertText: 'const ${1:ref} = useRef(${2:initialValue});',
    documentation: 'React useRef Hook',
  },
  {
    label: 'clg',
    insertText: 'console.log(${1:object});',
    documentation: 'Console Log',
  },
  {
    label: 'imp',
    insertText: 'import ${2:moduleName} from "${1:module}";',
    documentation: 'Import statement',
  }
];
