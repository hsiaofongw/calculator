import { IRuleSelectorMap } from './syntax';
import {
  ISyntaxTreeNodeGroup,
  ISyntaxTreeNodeRewriteOption,
  SyntaxTreeNodeGroup,
} from './tree';

export type ISyntaxRewriteContext = {
  treeNodesGroup: SyntaxTreeNodeGroup;
  ruleSelectorMap: IRuleSelectorMap;
};

export class SyntaxRewriteContext implements ISyntaxRewriteContext {
  public readonly treeNodesGroup!: SyntaxTreeNodeGroup;
  public readonly ruleSelectorMap!: IRuleSelectorMap;

  constructor(data: ISyntaxRewriteContext) {
    this.treeNodesGroup = data.treeNodesGroup;
    this.ruleSelectorMap = data.ruleSelectorMap;
  }

  public static create(data: ISyntaxRewriteContext) {
    return new SyntaxRewriteContext(data);
  }

  public step(): ISyntaxTreeNodeRewriteOption | undefined {
    const rewriteOption = this.treeNodesGroup.findRewriteOption(
      this.ruleSelectorMap,
    );

    if (rewriteOption) {
      this.treeNodesGroup.rewriteThisInPlace(rewriteOption);
      return rewriteOption;
    }

    return undefined;
  }
}
