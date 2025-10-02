import * as React from "react";
import { SurgeryApp } from "./SurgeryApp";
import { createRoot } from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { extendTheme, withDefaultColorScheme } from "@chakra-ui/react";

const linkedinTheme = extendTheme(
  withDefaultColorScheme({ colorScheme: "linkedin" })
);

class SurgeryUI {
  constructor({ wrapper, page }) {
    this.$wrapper = $(wrapper);
    this.page = page;
    this.init();
  }

  init() {
    const root = createRoot(this.$wrapper.get(0));
    root.render(
      <ChakraProvider theme={linkedinTheme}>
        <SurgeryApp />
      </ChakraProvider>
    );
  }
}

frappe.provide("surgery.ui");
surgery.ui.SurgeryUI = SurgeryUI;
export default SurgeryUI;