sap.ui.define([
    "sap/ui/core/mvc/Controller",
     "sap/ui/model/json/JSONModel"
], (Controller,JSONModel) => {
    "use strict";

    return Controller.extend("vcapp.vcpnewanalyticaldashboard.controller.Home", {
        onInit() {
        const oData = [
        { id: "PL001", status: "Active" },
        { id: "PL002", status: "Inactive" }
      ];
      this.getView().setModel(new JSONModel(oData));
      
    },

    onRefreshPress: function () {
      sap.m.MessageToast.show("Refreshing dashboard data...");
      sap.m.MessageToast.show("loadededdd");
      // You can trigger backend calls or refresh logic here
    }
  });
});