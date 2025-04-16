namespace Events {
    let eventHandlers: { [key: string]: Function } = {};

    export function addGraphEvents() {
        removeGraphEvents();

        if (Object.keys(eventHandlers).length > 0) return;
        const showPorts = (ports: NodeListOf<SVGElement>, show: boolean) => {
            for (let i = 0, len = ports.length; i < len; i += 1) {
                ports[i].style.visibility = show ? "visible" : "hidden";
            }
        };

        eventHandlers.nodeMouseEnter = () => {
            const container = document.getElementById("graph-container")!;
            let cellPorts = container.querySelectorAll(".x6-port-body") as NodeListOf<SVGElement>;
            showPorts(cellPorts, true);
        };

        eventHandlers.nodeMouseLeave = () => {
            const container = document.getElementById("graph-container")!;
            let cellPorts = container.querySelectorAll(".x6-port-body") as NodeListOf<SVGElement>;
            showPorts(cellPorts, false);
        };

        eventHandlers.cellClick = ({ cell, node }) => {
            if (cell.isNode()) {
                modelData.getData().focusedCell = true;
                modelData.refresh();

                if (previousSource && previousSource.hasTool("boundary")) {
                    previousSource.removeTool("boundary");
                }

                clickedSource = cell;

                const nodeID = clickedSource.id;
                clickedSource.attr("metadata/nodeID", nodeID);

                const nodeShape = clickedSource.shape;
                clickedSource.attr("metadata/shape", nodeShape);

                const nodeName = clickedSource.attr("metadata/name") || null;
                const nodeTitle = clickedSource.attr("metadata/title") || null;
                const nodeDesc = clickedSource.attr("metadata/description") || null;
                const nodeAppType = clickedSource.attr("metadata/appType") || null;
                const nodeIcon = clickedSource.attr("icon/xlinkHref") || null;

                modelSelectedNode.setData({
                    nodeID: nodeID,
                    shape: nodeShape,
                    name: nodeName,
                    title: nodeTitle,
                    description: nodeDesc,
                    appType: nodeAppType,
                    icon: nodeIcon,
                });

                modelSelectedNode.refresh();

                if (!node.hasTool("boundary")) {
                    node.addTools({
                        name: "boundary",
                        args: {
                            attrs: {
                                fill: "#7c68fc",
                                stroke: "#9254de",
                                strokeWidth: 1,
                                fillOpacity: 0.2,
                            },
                        },
                    });
                }
                previousSource = cell;
                previousSource.removeTool("button-remove");
            }
        };

        eventHandlers.cellDown = ({ cell, e }) => {
            const view = cell.findView(graph);
            if (!view) return;

            if (!cell.getAttrs().metadata.hasChildren) return;

            const buttonElement = view.findOne("circle.expand-collapse-btn");
            if (!buttonElement) return;

            const svgPoint = graph.clientToLocal(e.clientX, e.clientY);

            const nodePosition = cell.getPosition();

            const buttonX = cell.attr("btn-circle/cx");
            const buttonY = cell.attr("btn-circle/cy");
            const buttonRadius = cell.attr("btn-circle/r");

            const absoluteButtonX = nodePosition.x + buttonX;
            const absoluteButtonY = nodePosition.y + buttonY;

            const distance = Math.sqrt(
                Math.pow(svgPoint.x - absoluteButtonX, 2) +
                    Math.pow(svgPoint.y - absoluteButtonY, 2)
            );

            if (distance <= buttonRadius) {
                Transform.toggleNodeExpansion(cell.id);
                e.stopPropagation();
            }
        };

        eventHandlers.nodeMouseEnterWithNode = ({ node }) => {
            if (node.store.previous.shape !== "launchpad") {
                node.addTools({
                    name: "button-remove",
                    args: {
                        x: 0,
                        y: 0,
                        offset: { x: 10, y: 10 },
                    },
                });
            }
        };

        eventHandlers.nodeMouseLeaveWithNode = ({ node }) => {
            if (node.store.previous.shape !== "launchpad") {
                node.removeTool("button-remove");
            }
        };

        eventHandlers.edgeMouseEnter = ({ edge }) => {
            edge.addTools({
                name: "button-remove",
                args: { distance: -40 },
            });
        };

        eventHandlers.edgeMouseLeave = ({ edge }) => {
            edge.removeTool("button-remove");
        };

        eventHandlers.blankClick = ({ cell, node }) => {
            modelData.getData().focusedCell = false;
            modelData.refresh();
            if (previousSource && previousSource.hasTool("boundary")) {
                previousSource.removeTool("boundary");
            }
            previousSource = null;
            modelSelectedNode.setData({
                nodeID: null,
                shape: null,
                name: null,
                title: null,
                description: null,
                appType: null,
                icon: null,
            });
            if (clickedSource) {
                clickedSource.removeTool("button-remove");
            }
            const container = document.getElementById("graph-container")!;
            let cellPorts = container.querySelectorAll(".x6-port-body") as NodeListOf<SVGElement>;
            showPorts(cellPorts, true);
        };
        const mode = modelData.getData().mode;

        if (mode === "create") {
            graph.on("node:mouseenter", eventHandlers.nodeMouseEnter);
            graph.on("node:mouseleave", eventHandlers.nodeMouseLeave);
            graph.on("node:mouseenter", eventHandlers.nodeMouseEnterWithNode);
            graph.on("node:mouseleave", eventHandlers.nodeMouseLeaveWithNode);
            graph.on("edge:mouseenter", eventHandlers.edgeMouseEnter);
            graph.on("edge:mouseleave", eventHandlers.edgeMouseLeave);
            graph.on("cell:click", eventHandlers.cellClick);
            graph.on("blank:click", eventHandlers.blankClick);
        } else if (mode === "view") {
            graph.on("cell:click", eventHandlers.cellClick);
            graph.on("blank:click", eventHandlers.blankClick);
            graph.on("cell:mousedown", eventHandlers.cellDown);

            const nodes = graph.getNodes();

            nodes.forEach((node) => {
                let cellPorts = node.getPorts();

                cellPorts.forEach((port: any) => {
                    node.portProp(port.id, "attrs/circle", {
                        stroke: "none",
                        fill: "none",
                        magnet: false,
                    });
                });
            });
        } else {
            return;
        }
    }

    function removeGraphEvents() {
        graph.off("node:mouseenter", eventHandlers.nodeMouseEnter);
        graph.off("node:mouseleave", eventHandlers.nodeMouseLeave);
        graph.off("cell:click", eventHandlers.cellClick);
        graph.off("node:mouseenter", eventHandlers.nodeMouseEnterWithNode);
        graph.off("node:mouseleave", eventHandlers.nodeMouseLeaveWithNode);
        graph.off("edge:mouseenter", eventHandlers.edgeMouseEnter);
        graph.off("edge:mouseleave", eventHandlers.edgeMouseLeave);
        graph.off("blank:click", eventHandlers.blankClick);
        graph.off("cell:mousedown", eventHandlers.cellDown);
        eventHandlers = {};
    }
}
