export class IndentManager {
  private state: number = 0
  constructor(
    private readonly indentStr: string = ' ',
    private readonly step: number = 2
  ) {}

  go(n: number = 1) {
    this.state += this.step * n
    return this.getIndent()
  }

  back(n: number = 1) {
    this.state -= this.step * n
    if (this.state < 0) {
      throw new Error('state < 0')
    }
    return this.getIndent()
  }

  getIndent() {
    return this.indentStr.repeat(this.state)
  }

  reset() {
    this.state = 0
  }
}
