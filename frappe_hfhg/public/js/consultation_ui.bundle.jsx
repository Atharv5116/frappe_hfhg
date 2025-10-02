import * as React from "react";
import { ConsultationApp } from "./ConsultationApp";
import { createRoot } from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { extendTheme, withDefaultColorScheme } from "@chakra-ui/react";

const linkedinTheme = extendTheme(
  withDefaultColorScheme({ colorScheme: "linkedin" })
);

class ConsultationUI {
  constructor({ wrapper, page }) {
    this.$wrapper = $(wrapper);
    this.page = page;
    this.init();
  }

  init() {
    const root = createRoot(this.$wrapper.get(0));
    root.render(
      <ChakraProvider theme={linkedinTheme}>
        <ConsultationApp />
      </ChakraProvider>
    );
  }
}

frappe.provide("consultation.ui");
consultation.ui.ConsultationUI = ConsultationUI;
export default ConsultationUI;