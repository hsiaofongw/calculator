/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { Node, NonTerminalNode } from 'src/parser/interfaces';
import { Transform, TransformCallback } from 'stream';
import {
  AssignSymbol,
  DivideSymbol,
  EqualQSymbol,
  GreaterThanOrEqualSymbol,
  GreaterThanSymbol,
  LessThanOrEqualSymbol,
  LessThanSymbol,
  ListSymbol,
  MinusSymbol,
  NegativeSymbol,
  NumberSymbol,
  PlusSymbol,
  PowerSymbol,
  RemainderSymbol,
  StringSymbol,
  SymbolSymbol,
  TimesSymbol,
} from './config';
import { Expr } from './interfaces';

type Evaluator = (node: NonTerminalNode) => void;
type EvaluatorMap = Record<string, Evaluator>;

const doNothing = (_: any) => {};

export class ExpressionTranslate extends Transform {
  _nodeStack: Expr[] = [];

  _evaluatorMap: EvaluatorMap = {
    "S -> S' CMP_0": (node) => this._evaluateEveryChild(node),

    "CMP_0 -> == S' CMP_0": (node) => this._reduce(node, EqualQSymbol, 1, 2),

    'CMP_0 -> ε': doNothing,

    "S' -> E CMP_2": (node) => this._evaluateEveryChild(node),

    'L -> ε': doNothing,

    "L -> S L'": (node) => this._reduceByAppend(node, 0, 1),

    "L' -> , S L'": (node) => this._reduceByAppend(node, 1, 2),

    "L' -> ε": doNothing,

    'CMP_2 -> > E CMP_2': (node) => this._reduce(node, GreaterThanSymbol, 1, 2),

    'CMP_2 -> < E CMP_2': (node) => this._reduce(node, LessThanSymbol, 1, 2),

    'CMP_2 -> >= E CMP_2': (node) =>
      this._reduce(node, GreaterThanOrEqualSymbol, 1, 2),

    'CMP_2 -> <= E CMP_2': (node) =>
      this._reduce(node, LessThanOrEqualSymbol, 1, 2),

    'CMP_2 -> ε': doNothing,

    "E -> T E'": (node) => this._evaluateEveryChild(node),

    "E' -> '+' T E'": (node) => this._reduce(node, PlusSymbol, 1, 2),

    "E' -> '-' T E'": (node) => this._reduce(node, MinusSymbol, 1, 2),

    "E' -> ε": doNothing,

    "T -> REM_0 T'": (node) => this._evaluateEveryChild(node),

    "T' -> '*' REM_0 T'": (node) => this._reduce(node, TimesSymbol, 1, 2),

    "T' -> '/' REM_0 T'": (node) => this._reduce(node, DivideSymbol, 1, 2),

    "T' -> ε": doNothing,

    'REM_0 -> NEG REM_1': (node) => this._evaluateEveryChild(node),

    'REM_1 -> % NEG REM_1': (node) => this._reduce(node, RemainderSymbol, 1, 2),
    'REM_1 -> ε': doNothing,

    'NEG -> - POW_0': (node) => {
      this._evaluate(node.children[1]);
      const theValue = this._popNode();
      const negativeNode: Expr = {
        head: NegativeSymbol,
        nodeType: 'nonTerminal',
        children: [theValue],
      };
      this._pushNode(negativeNode);
    },

    'NEG -> POW_0': (node) => this._evaluateEveryChild(node),

    'POW_0 -> F POW_1': (node) => this._evaluateEveryChild(node),
    'POW_1 -> ^ F POW_1': (node) => this._reduce(node, PowerSymbol, 1, 2),
    'POW_1 -> ε': doNothing,

    "F -> F' P": (node) => this._evaluateEveryChild(node),

    "F' -> ( E )": (node) => this._evaluate(node.children[1]),

    "F' -> number": (node) => {
      const v1 = node.children[0];
      if (v1.type === 'terminal' && v1.token) {
        const value = parseFloat(v1.token?.content ?? '0');
        const numberNode: Expr = {
          head: NumberSymbol,
          nodeType: 'terminal',
          expressionType: 'number',
          value: value,
        };
        this._pushNode(numberNode);
      }
    },

    "F' -> id": (node) => {
      const v1 = node.children[0];
      if (v1.type === 'terminal' && v1.token) {
        const identifier = v1.token.content;
        const symbolNode: Expr = {
          head: SymbolSymbol,
          nodeType: 'terminal',
          expressionType: 'symbol',
          value: identifier,
        };
        this._pushNode(symbolNode);
      }
    },

    "F' -> str": (node) => {
      const v1 = node.children[0];
      if (v1.type === 'terminal') {
        const stringContent = v1.token.content ?? '';
        const stringNode: Expr = {
          head: StringSymbol,
          nodeType: 'terminal',
          expressionType: 'string',
          value: stringContent,
        };
        this._pushNode(stringNode);
      }
    },

    "F' -> { L }": (node) => {
      const list = node.children[1];
      const listNode: Expr = {
        head: ListSymbol,
        nodeType: 'nonTerminal',
        children: [],
      };
      this._pushNode(listNode);
      this._evaluate(list);
    },

    'P -> [ L ] P': (node) => {
      const previousNode: Expr = this._popNode();
      const functionNode: Expr = {
        head: previousNode,
        nodeType: 'nonTerminal',
        children: [],
      };
      this._pushNode(functionNode);
      this._evaluate(node.children[1]);
      this._evaluate(node.children[3]);
    },

    'P -> = S': (node) => {
      const leftValueNode = this._popNode();
      const assignNode: Expr = {
        head: AssignSymbol,
        nodeType: 'nonTerminal',
        children: [leftValueNode],
      };

      this._evaluate(node.children[1]);
      const rightValue = this._popNode();
      assignNode.children.push(rightValue);

      this._pushNode(assignNode);
    },

    'P -> ε': (_) => {},
  };

  constructor() {
    super({ objectMode: true });
  }

  private _reduce(
    node: Node,
    head: Expr,
    currIdx: number,
    nextIdx: number,
  ): void {
    if (node.type === 'nonTerminal') {
      const prev = this._popNode();
      this._evaluate(node.children[currIdx]);
      const current = this._popNode();

      const reduced: Expr = {
        nodeType: 'nonTerminal',
        head: head,
        children: [prev, current],
      };

      this._pushNode(reduced);

      this._evaluate(node.children[nextIdx]);
    }
  }

  private _reduceByAppend(
    node: NonTerminalNode,
    currIdx: number,
    nextIdx: number,
  ): void {
    const prev = this._popNode();
    if (prev.nodeType === 'nonTerminal') {
      this._evaluate(node.children[currIdx]);
      const current = this._popNode();
      const appended: Expr = {
        nodeType: 'nonTerminal',
        head: prev.head,
        children: [...prev.children, current],
      };
      this._pushNode(appended);
      this._evaluate(node.children[nextIdx]);
    }
  }

  private _evaluateEveryChild(node: Node): void {
    if (node.type === 'nonTerminal') {
      node.children.forEach((child) => this._evaluate(child));
    }
  }

  private _pushNode(node: Expr): void {
    this._nodeStack.push(node);
  }

  private _popNode(): Expr {
    return this._nodeStack.pop() as Expr;
  }

  private _evaluate(node: Node): void {
    if (node.type === 'nonTerminal') {
      const evaluator = this._evaluatorMap[node.ruleName];
      if (typeof evaluator === 'function') {
        evaluator(node);
      } else {
        console.error(`No evaluator`);
        console.error({ node });
        process.exit(1);
      }
    } else {
      console.error(`Try evaluate a terminal node`);
      console.error({ node });
      process.exit(1);
    }
  }

  _transform(
    node: Node,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    if (node.type === 'nonTerminal') {
      this._evaluate(node);
      this.push(this._nodeStack.pop());
    }
    callback();
  }
}
