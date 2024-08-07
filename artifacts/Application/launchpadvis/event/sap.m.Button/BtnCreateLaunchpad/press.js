const {namesCondition, edgesCondition, shapeCondition} = Functions.checkBeforeCreate();

if (namesCondition && edgesCondition && shapeCondition) {
    const nestedGraph = Functions.graphToJSON();
    Functions.graphToNeptune(nestedGraph)
        .then((response) => {
            sap.m.MessageBox.confirm("Launchpad created! Would you like to see the launchpad?", {
                title: "Confirm",
                icon: "QUESTION",
                actions: ["YES", "NO"],
                onClose: function (answer) {
                    if (answer === "NO") {
                    } else {
                        Functions.navigate("run","launchpad",response.name,response.id);
                    }
                    Functions.clear();
                    Functions.addLaunchpadNode();
                    Functions.centerContent();
                },
            });
        })
        .catch((error) => {
            console.error("Error processing graph", error);
            sap.m.MessageBox.error(error);
        });
} else {
    if (!namesCondition && !edgesCondition && !shapeCondition) {
        sap.m.MessageBox.warning("Necessary fields are missing, some nodes are not connected, and required artifacts are missing. Please fill all the required fields, connect the nodes properly, and ensure all necessary artifacts are included.");
    } else if (!namesCondition && !edgesCondition && shapeCondition) {
        sap.m.MessageBox.warning("Necessary fields are missing and some nodes are not connected. Please ensure all required fields are filled and all nodes are properly connected.");
    } else if (!namesCondition && edgesCondition && !shapeCondition) {
        sap.m.MessageBox.warning("Necessary fields are missing and required artifacts are missing. Please fill all required fields and include all necessary artifacts.");
    } else if (namesCondition && !edgesCondition && !shapeCondition) {
        sap.m.MessageBox.warning("Some nodes are not connected and required artifacts are missing. Please connect all nodes properly and include all necessary artifacts.");
    } else if (!namesCondition && edgesCondition && shapeCondition) {
        sap.m.MessageBox.warning("Necessary fields are missing. Please fill all required fields.");
    } else if (namesCondition && !edgesCondition && shapeCondition) {
        sap.m.MessageBox.warning("Some nodes are not connected. Please ensure all nodes are properly connected.");
    } else if (namesCondition && edgesCondition && !shapeCondition) {
        sap.m.MessageBox.warning("Required artifacts are missing. Please include all necessary artifacts.");
    }
}
