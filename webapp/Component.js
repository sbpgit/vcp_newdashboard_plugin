sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/m/BusyDialog",
  "sap/base/Log"
], function (UIComponent, BusyDialog, Log) {
  "use strict";

  return UIComponent.extend("vcapp.vcpnewanalyticaldashboard.Component", {
    metadata: { manifest: "json" },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);
      Log.info("FLP Plugin: Initializing (iframe-based Planner Dashboard plugin)...");

      const renderer = sap.ushell.Container.getRenderer("fiori2");
      if (renderer && typeof renderer.then === "function") {
        renderer.then(this._observeSpaceTabs.bind(this))
          .catch(err => Log.error("Renderer (async) not available", err));
      } else if (renderer) {
        this._observeSpaceTabs(renderer);
      } else {
        sap.ushell.Container.attachRendererCreatedEvent((event) => {
          this._observeSpaceTabs(event.getParameter("renderer"));
        });
      }
       
    },

    /**
     * Observe the Spaces & Pages tab bar
     */
    _observeSpaceTabs: function () {
      Log.info("FLP Plugin: Observing Space tabs...");

      const attachListeners = () => {
        const tabs = document.querySelectorAll(".sapMITHTextContent");
        tabs.forEach(tab => {
          const label = tab.textContent.trim();
          if (tab.dataset.listenerAttached) return;
          tab.dataset.listenerAttached = "true";
          tab.style.cursor = "pointer";

          tab.addEventListener("click", () => this._onTabClick(label));
        });
      };

      setTimeout(attachListeners, 2000);

      const observer = new MutationObserver(() => attachListeners());
      observer.observe(document.body, { childList: true, subtree: true });
    },

    /**
     * Handle group (tab) click
     */
    _onTabClick: function (label) {
      Log.info(`FLP Plugin: Tab clicked → ${label}`);

      // Clean up iframe if user navigates away
      const existingFrame = document.getElementById("plannerDashboardFrame");
      if (existingFrame && label !== "Planner's-Dashboard" && label !== "Planner’s-Dashboard") {
        existingFrame.remove();
        Log.info("FLP Plugin: Removed Planner’s Dashboard iframe (user switched tab).");
      }

      // Only embed if Planner's Dashboard clicked
      if (label === "Planner's-Dashboard" || label === "Planner’s-Dashboard") {
        this._showLoading();
        setTimeout(() => this._embedPlannerDashboardIFrame(), 1000);
      }
    },

    /**
     * Show BusyDialog while loading
     */
    _showLoading: function () {
      if (this._busyDialog) return;
      this._busyDialog = new BusyDialog({
        title: "Loading Planner’s Dashboard...",
        text: "Please wait while the dashboard loads."
      });
      this._busyDialog.open();
    },

    _hideLoading: function () {
      if (this._busyDialog) {
        this._busyDialog.close();
        this._busyDialog.destroy();
        this._busyDialog = null;
      }
    },

    /**
     * Embed Planner’s Dashboard app via iframe
     */
    _embedPlannerDashboardIFrame: function () {
      Log.info("FLP Plugin: Embedding Planner’s Dashboard via iframe...");

      // Find the main Space content container
      const container =
        document.querySelector(".sapUshellFlexGrowShrink.sapUshellFlexColumn.sapUshellPositionRelative") ||
        document.querySelector(".sapUshellFlexGrowShrink.sapUshellFlexColumn") ||
        document.querySelector(".sapUshellShell") ||
        document.querySelector(".sapUshellPage");


      Log.info("FLP Plugin: Container found → " + container.className);

      // Remove existing iframe if re-clicked
      let iframe = document.getElementById("plannerDashboardFrame");
      if (iframe) iframe.remove();
      sap.ushell.Container.getServiceAsync("CrossApplicationNavigation").then(oNav => {
        const sHash = oNav.hrefForExternal({
          target: { semanticObject: "vcplannerdashboard", action: "Display" },
          params: { "sap-ushell-config": "lean" }
        });
        iframe.src = sHash; // uses Launchpad internal resolver
      });

      // Create iframe
      iframe = document.createElement("iframe");
      iframe.id = "plannerDashboardFrame";
      // iframe.src = sap.ui.require.toUrl("vcp/vcplanner/view/View1.view.xml")
      iframe.style.width = "100%";
      iframe.style.height = "110%";
      iframe.style.border = "none";
      iframe.style.marginTop = "-50px";
      // iframe.style.marginBottom = "-50px";
      iframe.style.borderRadius = "12px";
      iframe.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
      iframe.setAttribute("title", "Planner’s Dashboard (Embedded Lean Mode)");
      container.insertBefore(iframe, container.firstChild);     
      Log.info("FLP Plugin: ✅ Planner’s Dashboard iframe embedded successfully.");
      this._hideLoading();
      
    },
    


    /**
     * Cleanup on exit
     */
    exit: function () {
      const iframe = document.getElementById("plannerDashboardFrame");
      if (iframe) iframe.remove();
      this._hideLoading();
      Log.info("FLP Plugin: Cleanup done on exit.");
    }
  });
});
