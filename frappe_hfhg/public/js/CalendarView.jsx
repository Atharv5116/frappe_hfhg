import * as React from 'react';
import { DayPilot, DayPilotCalendar, DayPilotMonth, DayPilotNavigator } from "@daypilot/daypilot-lite-react";

export function CalendarView({startDate,events,view,onTimeRangeSelected,setMonthView,onEventClicked}) {

    return (<DayPilotMonth
        startDate={startDate}
        events={events}
        visible={view === "Month"}
        eventBarVisible={true}
        onTimeRangeSelected={onTimeRangeSelected}
        controlRef={setMonthView}
        onEventClicked={onEventClicked}
        
      /> );
}