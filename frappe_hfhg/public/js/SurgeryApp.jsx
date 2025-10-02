import React, { useEffect, useRef, useState } from 'react';
import { DayPilot, DayPilotCalendar, DayPilotMonth, DayPilotNavigator } from "@daypilot/daypilot-lite-react";
import {
  Select, Button, Stack, Card, Heading, FormLabel, Box, Grid, GridItem, FormControl, SimpleGrid, Stat, StatLabel, Flex, StatNumber,
  useColorModeValue,
  VStack
} from '@chakra-ui/react'
import {CalendarView} from './CalendarView'

const StatsCard = (args) => {
  const { title, stat, icon } = args
  return (
    <Stat
    paddingTop={5}
    paddingLeft={5}
    size={'xs'}
    shadow={'xs'}
    border='1px'
    borderColor='gray.200'
    rounded={'md'}>
      <VStack align={"start"}>
          <StatLabel fontWeight={'light'} fontSize={'2md'} isTruncated>
            {title}
          </StatLabel>
          <StatNumber fontSize={'2xl'} fontWeight={'light'}>
            {stat}
          </StatNumber>
        </VStack>
    
  </Stat>
  )
}

export const SurgeryApp = () => {

  const [view, setView] = useState("Month");
  const [startDate, setStartDate] = useState(DayPilot.Date.today());
  const [events, setEvents] = useState([]);
  const [startDatePicker, setStartDatePicker] = useState(new Date());
  const [monthView, setMonthView] = useState();
  const [center, setCenter] = useState("ALL")
  const [centers, setCenters] = useState([])
  const [year, setYear] = useState()
  const [month, setMonth] = useState()
  const [calendarData, setCalendarData] = useState({});
  const years = Array.from({ length: 2025 - 2020 + 1 }, (v, i) => 2020 + i);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const [income, setIncome] = useState(0);
  const [incomeTillToday, setIncomeTillToday] = useState(0);
  const [slots, setSlots] = useState(0);

  const getMonthName = (args) => {
    return months[args]
  }

  const getMonthNumber = (args) => {
    return months.indexOf(args)
  }
  const onTimeRangeSelected = async (args) => {
   
  };

  const onEventClicked = (args) => {
    console.log(args.e.data);
  };
  const onMonthChanged = (args, _) => {
    var url = "";
    if(args.e.data.type === "Surgery"){
      url = `http://${window.location.hostname}:${window.location.port}/app/surgery/${args.e.data.text}`;
    }else if(args.e.type === "Consultation"){
      url = `http://${window.location.hostname}:${window.location.port}/app/consultation/${args.e.data.text}`;
    }else{
      url = `http://${window.location.hostname}:${window.location.port}/app/treatment/${args.e.data.text}`;
    }
    window.open(url);
    // setMonth(args);
  }

  const getEventColor = (type) => {
    switch(type){
      case "Treatment":
        return "#B4D6CD";
      case "Consultation":
        return "#FFDA76";
      case "Surgery":
        return "#A2CA71";    
    }
  }
  const getCalendarData = (year, month, center) => {
    frappe
      .call("frappe_hfhg.api.get_surgery_data", {
        year: year,
        month: month,
        center: center,
    })
      .then((response) => {
        console.log(response.message);

        setSlots(response.message.slots);
        setIncome(new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 2
      }).format(response.message.income));
        setIncomeTillToday(new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 2
      }).format(response.message.income_till_today));

        setEvents(response.message.data.map((e,i) => {
          return {
            id: i,
            text: e.name,
            start: new DayPilot.Date(e.date),
            end: new DayPilot.Date(e.date),
            backColor:getEventColor(e.type), // Orange background
            borderColor: "darker",
            type: e.type
          }
        }));
        setStartDate(new DayPilot.Date(`${year}-${month.toString().padStart(2,"0")}-01`))
      })
      .catch((e) => {
        console.error(e);
        toast({
          title: "Something went wrong, check console",
          status: "error",
          position: "bottom-right",
        });
      });
  }

  const getCenters = () => {
    frappe
      .call("frappe_hfhg.api.get_centers")
      .then((response) => {
        console.log(response.message);
        setCenters(["ALL"].concat(response.message));
      })
      .catch((e) => {
        console.error(e);
        toast({
          title: "Something went wrong, check console",
          status: "error",
          position: "bottom-right",
        });
      });
  }

  const onButtonClicked = () => {
    console.log(year, " : ", month, ":", center);
    getCalendarData(year, getMonthNumber(month) +1, center);

  };
  useEffect(() => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    setYear(year);
    setMonth(getMonthName(month));
    getCenters();
    getCalendarData(year, month + 1, center);
  }, []);

  console.log(startDatePicker);

  return (
    <Grid
      h='200px'
      templateRows='repeat(2, 1fr)'
      templateColumns='repeat(5, 1fr)'
      gap={4}
    >
      <GridItem rowSpan={2} colSpan={1} >
        <Box
          borderWidth="1px"
          rounded="lg"
          shadow="1px 1px 3px rgba(0,0,0,0.3)"
          maxWidth={800}
          p={6}
          m="10px auto"
          as="form">
          <Stack spacing={4}>
            <FormControl>
              <FormLabel
                htmlFor="year"
                fontSize="md"
                fontWeight="md"
                color="gray.700"
                _dark={{
                  color: 'gray.50',
                }}>
                Year
              </FormLabel>
              <Select placeholder={year} value={year} onChange={(val, _) => setYear(val.target.value)} >
                {years.map((e) => {
                  return <option value={e}>{e}</option>
                })}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel
                htmlFor="month"
                fontSize="md"
                fontWeight="md"
                color="gray.700"
                _dark={{
                  color: 'gray.50',
                }}>
                Month
              </FormLabel>
              <Select placeholder={month} value={month} onChange={(val, _) => {
                setMonth(val.target.value);
              }}>
                {months.map((e) => {
                  return <option value={e}>{e}</option>
                })}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel
                htmlFor="center"
                fontSize="md"
                fontWeight="md"
                color="gray.700"
                _dark={{
                  color: 'gray.50',
                }}>
                Center
              </FormLabel>
              <Select value={center} onChange={(val, _) => setCenter(val.target.value)} >
                {centers.map((e) => {
                  return <option value={e}>{e}</option>
                })}
              </Select>
            </FormControl>
            <Button colorScheme='blue' onClick={onButtonClicked}>Get Data</Button>
          </Stack>
        </Box>
      </GridItem>
      <GridItem colSpan={4}>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 5, lg: 8 }}>
          <StatsCard title={'Total Treatments'} stat={`${slots}`} />
          <StatsCard title={'Total Income of Month'} stat={`${income}`} />
          <StatsCard title={'Income Till Today'} stat={`${incomeTillToday}`} />
        </SimpleGrid>
      </GridItem>
      <GridItem colSpan={4} >
        <CalendarView 
          startDate = {startDate}
          events = {events}
          view = {view}
          onTimeRangeSelected = {onTimeRangeSelected}
          setMonthView = {setMonthView}
          onEventClicked = {onEventClicked}
        />
      </GridItem>
    </Grid>

  );
}
// export default AppointmentApp;
