import * as React from "react";
import { TreatmentApp } from "./TreatmentApp";
import { createRoot } from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { extendTheme, withDefaultColorScheme } from "@chakra-ui/react";

const linkedinTheme = extendTheme(
  withDefaultColorScheme({ colorScheme: "linkedin" })
);

class TreatmentUI {
  constructor({ wrapper, page }) {
    this.$wrapper = $(wrapper);
    this.page = page;
    this.init();
  }

  init() {
    const root = createRoot(this.$wrapper.get(0));
    root.render(
      <ChakraProvider theme={linkedinTheme}>
        <TreatmentApp />
      </ChakraProvider>
    );
  }
}

frappe.provide("treatment.ui");
treatment.ui.TreatmentUI = TreatmentUI;
export default TreatmentUI;