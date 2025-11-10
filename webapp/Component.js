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
      sap.ui.core.BusyIndicator.show(0);
      const renderer = sap.ushell.Container.getRenderer("fiori2");
      if (renderer && typeof renderer.then === "function") {
        renderer.then(this._observeSpaceTabs.bind(this))
          .catch(err => Log.error("Renderer (async) not available", err));
        sap.ui.core.BusyIndicator.show(0);
      } else if (renderer) {
        this._observeSpaceTabs(renderer);
      } else {
        sap.ushell.Container.attachRendererCreatedEvent((event) => {
          this._observeSpaceTabs(event.getParameter("renderer"));
        });
      }
      // 🔹 Detect FLP shell navigations (like clicking the SBP Home logo)
      sap.ushell.Container.getServiceAsync("ShellNavigation").then(oShellNav => {
        oShellNav.registerNavigationFilter((sHash) => {
          const iframe = document.getElementById("plannerDashboardFrame");
          if (iframe) {
            Log.info("FLP Plugin: Shell navigation detected, cleaning up iframe.");
            iframe.remove();
          }
          return sap.ushell.services.ShellNavigation.NavigationFilterStatus.Continue;
        });
      });
    },

    /**
     * Observe the Spaces & Pages tab bar
     */
    _observeSpaceTabs: function () {
      Log.info("FLP Plugin: Observing Space tabs (Planner Dashboard plugin)...");

      /**
       * Attach listeners to all space tabs
       */
      const attachListeners = () => {
        const tabs = document.querySelectorAll(".sapMITBItem .sapMITHTextContent");
        if (!tabs.length) {
          Log.warning("FLP Plugin: No tabs found yet — will retry.");
          return;
        }

        tabs.forEach(tab => {
          const label = tab.textContent.trim();
          if (!label || tab.dataset.listenerAttached) return;
          tab.dataset.listenerAttached = "true";
          tab.style.cursor = "pointer";

          tab.addEventListener("click", () => this._onTabClick(label));
        });

        Log.info(`FLP Plugin: Attached listeners to ${tabs.length} tabs.`);
      };

      /**
       * Repeatedly check for the active tab ("Planner Dashboard") until found
       */
      const waitForActiveTab = (maxWait = 10000, interval = 500) => {
        const start = Date.now();

        const check = () => {
          const activeTab = document.querySelector(
            ".sapMITBItem.sapMITBSelected .sapMITHTextContent"
          );

          if (activeTab) {
            const activeLabel = activeTab.textContent.trim();
            Log.info(`FLP Plugin: Active tab detected → ${activeLabel}`);

            if (activeLabel.toLowerCase() === "planner dashboard") {
              Log.info("FLP Plugin: Auto-loading Planner Dashboard after refresh...");
              this._onTabClick("Planner Dashboard");
            }
            return;
          }

          if (Date.now() - start < maxWait) {
            setTimeout(check, interval);
          } else {
            Log.warning("FLP Plugin: Active tab not found within timeout.");
          }
        };

        check();
      };

      /**
       * Run attachment + detection after short delay
       */
      setTimeout(() => {
        attachListeners();
        Log.info("FLP Plugin: Tab listeners attached successfully.");
        sap.ui.core.BusyIndicator.hide();

        // Start looking for the active tab after FLP renders
        waitForActiveTab();
      }, 2000);

      /**
       * Re-attach listeners when DOM changes (new Spaces or tab reloads)
       */
      const observer = new MutationObserver(() => attachListeners());
      observer.observe(document.body, { childList: true, subtree: true });
    }

    ,

    /**
     * Handle group (tab) click
     */
    _onTabClick: function (label) {
      Log.info(`FLP Plugin: Tab clicked → ${label}`);

      // Clean up iframe if user navigates away
      const existingFrame = document.getElementById("plannerDashboardFrame");
      if (existingFrame && label !== "Planner Dashboard") {
        existingFrame.remove();
        Log.info("FLP Plugin: Removed Planner’s Dashboard iframe (user switched tab).");
      }

      // Only embed if Planner's Dashboard clicked
      if (label === "Planner Dashboard") {
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
          target: { semanticObject: "vcplannerdashboardNew", action: "Display" },
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
