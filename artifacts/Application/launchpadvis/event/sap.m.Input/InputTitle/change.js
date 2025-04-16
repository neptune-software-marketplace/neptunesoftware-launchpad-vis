const nodeID = NodeID.getText();
const node = graph.getCellById(nodeID);
const nodeTitle = this.getValue();

node.attr("metadata/title", nodeTitle);
node.attr("text/text", nodeTitle); // new
Functions.setSize(node);