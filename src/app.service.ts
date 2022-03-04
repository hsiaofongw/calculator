import { Injectable } from '@nestjs/common';
import { syntaxAnalysisConfiguration } from './parser/helpers';
import { ToCharacters, ToToken } from './lexer/lexer';
import { createInterface } from 'readline';
import { LL1PredictiveParser, ToTerminalNode } from './parser/parser';
import { stdin, stdout } from 'process';
import { ExpressionTranslate } from './translate/translate';
import { ExpressionNodeSerialize } from './translate/serialize';
import { PreEvaluator } from './translate/evaluate';

@Injectable()
export class AppService {
  main(): void {
    const lineStream = createInterface({ input: stdin, output: stdout });

    let lineNumber = 0;
    const asking = () => {
      lineStream.question(`\nIn[${lineNumber}]: `, (expression) => {
        toChars.write(expression);
      });
    };

    asking();

    const toChars = new ToCharacters();
    const toToken = new ToToken();
    const toTerminalNode = new ToTerminalNode(syntaxAnalysisConfiguration);
    const parse = new LL1PredictiveParser(syntaxAnalysisConfiguration);
    const translate = new ExpressionTranslate();
    const preEvaluate = new PreEvaluator();
    const serialize = new ExpressionNodeSerialize();

    toChars
      .pipe(toToken)
      .pipe(toTerminalNode)
      .pipe(parse)
      .pipe(translate)
      .pipe(preEvaluate)
      .pipe(serialize);

    serialize.on('data', (datum) => {
      console.log(`\nOut[${lineNumber}]:`);
      console.log(datum);
      lineNumber = lineNumber + 1;

      asking();
    });
  }
}
