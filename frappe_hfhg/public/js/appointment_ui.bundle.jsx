import * as React from "react";
import { AppointmentApp } from "./AppointmentApp";
import { createRoot } from "react-dom/client";
import { ChakraProvider } from "@chakra-ui/react";
import { extendTheme, withDefaultColorScheme } from "@chakra-ui/react";

const linkedinTheme = extendTheme(
  withDefaultColorScheme({ colorScheme: "linkedin" })
);

class AppointmentUI {
  constructor({ wrapper, page }) {
    this.$wrapper = $(wrapper);
    this.page = page;
    this.init();
  }

  init() {
    const root = createRoot(this.$wrapper.get(0));
    root.render(
      <ChakraProvider theme={linkedinTheme}>
        <AppointmentApp />
      </ChakraProvider>
    );
  }
}

frappe.provide("appointment.ui");
appointment.ui.AppointmentUI = AppointmentUI;
export default AppointmentUI;