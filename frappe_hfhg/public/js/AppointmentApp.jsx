import React, { useEffect, useRef, useState } from "react";
import {
  DayPilot,
  DayPilotCalendar,
  DayPilotMonth,
  DayPilotNavigator,
} from "@daypilot/daypilot-lite-react";
import {
  Text,
  useDisclosure,
  Select,
  Button,
  Stack,
  Card,
  Heading,
  FormLabel,
  Box,
  Grid,
  GridItem,
  FormControl,
  SimpleGrid,
  Stat,
  StatLabel,
  Flex,
  StatNumber,
  useColorModeValue,
  Center,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import { CalendarView } from "./CalendarView";

const StatsCard = (args) => {
  const { title, stat, icon } = args;
  return (
    <Stat
      paddingTop={5}
      paddingLeft={5}
      height={"80px"}
      shadow={"xs"}
      border="1px"
      p={"8px"}
      borderColor="gray.200"
      rounded={"md"}
    >
      <VStack align={"start"}>
        <StatLabel fontWeight={"light"} fontSize={"2md"} isTruncated>
          {title}
        </StatLabel>
        <StatNumber fontSize={"2xl"} fontWeight={"light"}>
          {stat}
        </StatNumber>
      </VStack>
    </Stat>
  );
};

export const AppointmentApp = () => {
  const [view, setView] = useState("Month");
  const [startDate, setStartDate] = useState(DayPilot.Date.today());
  const [events, setEvents] = useState([]);
  const [startDatePicker, setStartDatePicker] = useState(new Date());
  const [monthView, setMonthView] = useState();
  const [center, setCenter] = useState("ALL");
  const [centers, setCenters] = useState([]);
  const [year, setYear] = useState();
  const [month, setMonth] = useState();
  const [type, setType] = useState("ALL");
  const [calendarData, setCalendarData] = useState({});
  const years = Array.from({ length: 2025 - 2020 + 1 }, (v, i) => 2020 + i);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const types = ["ALL", "Consultation", "Surgery", "Treatment"];

  const [income, setIncome] = useState(0);
  const [incomeTillToday, setIncomeTillToday] = useState(0);
  const [slots, setSlots] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [statsData, setStatsData] = useState({
    type: "ALL",
  });

  const onClose = () => setIsOpen(false);

  const getMonthName = (args) => {
    return months[args];
  };

  const getSlotTitle = () => {
    if (type == "ALL") {
      return `Appointments`;
    }

    if (type == "Surgery") {
      return "Surgeries";
    }
    if (type == "Consultation") {
      return "Consultations";
    }
    if (type == "Treatment") {
      return "Treatments";
    }
  };

  const getMonthNumber = (args) => {
    return months.indexOf(args);
  };
  const onTimeRangeSelected = async (args) => {};

  // const { isOpen, onOpen, onClose } = useDisclosure();
  // const [popupData, setPopupData] = useState(null);
  // const showPatientDetails = (surgeryId) => {

  //   frappe.call({
  //     method: 'frappe_hfhg.api.get_patient_details',
  //     args: { surgery_id: surgeryId },
  //     callback: function(response) {
  //       const patientDetails = response.message;
  //       showPopup(patientDetails);
  //     }
  //   });
  // };

  // const showPopup = (patientDetails) => {
  //   setPopupData(patientDetails);
  //   onOpen();
  // };

  // const onEventHovered = (args) => {
  //   console.log("Hovered over event", args.e.data);

  //   if (args.e.data && args.e.data.type === "Surgery") {
  //     const surgeryId = args.e.text;
  //     if (surgeryId) {
  //       console.log("Surgery ID:", surgeryId);
  //       showPatientDetails(surgeryId);
  //     }
  //   }
  // };

  const onEventClicked = (args) => {
    setIsOpen(true);
    setStatsData({
      type: args.e.data.type,
      patient: args.e.data.patient,
      phone: args.e.data.phone,
      city: args.e.data.city,
      status: args.e.data.status,
      center: args.e.data.center,
      doctor: args.e.data.doctor,
      slot: args.e.data.slot,
      executive: args.e.data.executive,
      note: args.e.data.note,
      payment: args.e.data.payment,
      lead_source: args.e.data.lead_source,
      grafts: args.e.data.grafts,
      graft_price: args.e.data.graft_price,
      technique: args.e.data.technique,
      amount_paid: args.e.data.amount_paid,
      prp: args.e.data.prp,
      pending_amount: args.e.data.pending_amount,
      with_gst_amount: args.e.data.with_gst_amount,
      without_gst_amount: args.e.data.without_gst_amount,
    });
  };
  const onMonthChanged = (args, _) => {
    // setMonth(args);
  };

  const getEventColor = (type) => {
    switch (type) {
      case "Treatment":
        return "#B4D6CD";
      case "Consultation":
        return "#FFDA76";
      case "Surgery":
        return "#A2CA71";
    }
  };

  const getCalendarData = (year, month, center, type) => {
    frappe
      .call("frappe_hfhg.api.get_calendar_data", {
        year: year,
        month: month,
        center: center,
        types: type,
      })
      .then((response) => {
        console.log(response.message);

        setSlots(response.message.slots);
        setIncome(
          new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
          }).format(response.message.income)
        );
        setIncomeTillToday(
          new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
          }).format(response.message.income_till_today)
        );

        setEvents(
          response.message.data.map((e, i) => {
            return {
              id: i,
              text: e.name,
              start: new DayPilot.Date(e.date),
              end: new DayPilot.Date(e.date),
              backColor: getEventColor(e.type), // Orange background
              borderColor: "darker",
              type: e.type,
              doc_id: e?.id,
              patient: e?.name,
              phone: e?.contact_number,
              city: e?.city,
              status: e?.status,
              center: e?.center,
              doctor: e?.doctor,
              slot: e?.slot,
              executive: e?.executive,
              note: e?.note,
              payment: e?.payment,
              lead_source: e?.lead_source,
              grafts: e?.grafts,
              graft_price: e?.graft_price,
              technique: e?.technique,
              amount_paid: e?.amount_paid,
              prp: e?.prp,
              pending_amount: e?.pending_amount,
              with_gst_amount: e?.with_gst_amount,
              without_gst_amount: e?.without_gst_amount,
            };
          })
        );
        setStartDate(
          new DayPilot.Date(`${year}-${month.toString().padStart(2, "0")}-01`)
        );
      })
      .catch((e) => {
        console.error(e);
        toast({
          title: "Something went wrong, check console",
          status: "error",
          position: "bottom-right",
        });
      });
  };

  const getCenters = (year, month) => {
    frappe
      .call("frappe_hfhg.api.get_centers")
      .then((response) => {
        console.log(response.message);
        setCenters(response.message);
        if (response.message.length > 0) {
          setCenter(response.message[0]);
        }
        getCalendarData(year, month + 1, response.message[0], type);
      })
      .catch((e) => {
        console.error(e);
        toast({
          title: "Something went wrong, check console",
          status: "error",
          position: "bottom-right",
        });
      });
  };

  const onButtonClicked = () => {
    console.log(year, " : ", month, ":", center, ":", type);
    getCalendarData(year, getMonthNumber(month) + 1, center, type);
  };
  useEffect(() => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    setYear(year);
    setMonth(getMonthName(month));
    getCenters(year, month);
  }, []);

  console.log(startDatePicker);

  return (
    <Grid
      h="200px"
      templateRows="repeat(2, 1fr)"
      templateColumns="repeat(5, 1fr)"
      gap={4}
    >
      <GridItem rowSpan={2} colSpan={1}>
        <Box
          borderWidth="1px"
          rounded="lg"
          shadow="1px 1px 1px rgba(0,0,0,0.05)"
          maxWidth={800}
          p={6}
          m="0px auto"
          as="form"
        >
          <Stack spacing={4}>
            <FormControl>
              <FormLabel
                htmlFor="year"
                fontSize="md"
                fontWeight="md"
                color="gray.700"
                _dark={{
                  color: "gray.50",
                }}
              >
                Year
              </FormLabel>
              <Select
                placeholder={year}
                value={year}
                onChange={(val, _) => setYear(val.target.value)}
              >
                {years.map((e) => {
                  return <option value={e}>{e}</option>;
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
                  color: "gray.50",
                }}
              >
                Month
              </FormLabel>
              <Select
                placeholder={month}
                value={month}
                onChange={(val, _) => {
                  setMonth(val.target.value);
                }}
              >
                {months.map((e) => {
                  return <option value={e}>{e}</option>;
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
                  color: "gray.50",
                }}
              >
                Center
              </FormLabel>
              <Select
                value={center}
                onChange={(val, _) => setCenter(val.target.value)}
              >
                {centers.map((e) => {
                  return <option value={e}>{e}</option>;
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
                  color: "gray.50",
                }}
              >
                Appointment Type
              </FormLabel>
              <Select
                value={type}
                onChange={(val, _) => setType(val.target.value)}
              >
                {types.map((e) => {
                  return <option value={e}>{e}</option>;
                })}
              </Select>
            </FormControl>
            <Button colorScheme="blue" onClick={onButtonClicked}>
              Get Data
            </Button>
          </Stack>
        </Box>
      </GridItem>
      {/* <GridItem colSpan={4}>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 5, md: 8 }}>
          <StatsCard title={`Total ${getSlotTitle()}`} stat={`${slots}`} />
          <StatsCard title={"Total Income of Month"} stat={`${income}`} />
          <StatsCard title={"Income Till Today"} stat={`${incomeTillToday}`} />
        </SimpleGrid>
      </GridItem> */}
      <GridItem colSpan={4}>
        <CalendarView
          startDate={startDate}
          events={events}
          view={view}
          onTimeRangeSelected={onTimeRangeSelected}
          setMonthView={setMonthView}
          onEventClicked={onEventClicked}
        />
      </GridItem>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{statsData.type}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              <strong>Patient:</strong> {statsData.patient}
            </Text>
            <Text>
              <strong>Contact No:</strong> {statsData.phone}
            </Text>
            <Text>
              <strong>Status:</strong> {statsData.status}
            </Text>
            <Text>
              <strong>Doctor:</strong> {statsData.doctor}
            </Text>
            <Text>
              <strong>City:</strong> {statsData.city}
            </Text>
            <Text>
              <strong>Center:</strong> {statsData.center}
            </Text>
            <Text>
              <strong>Executive:</strong> {statsData.executive}
            </Text>
            {statsData.type === "Surgery" ? (
              <>
                <Text>
                  <strong>Source:</strong> {statsData.lead_source}
                </Text>
                <Text>
                  <strong>Grafts:</strong> {statsData.grafts}
                </Text>
                <Text>
                  <strong>Per graft price:</strong> {Number(statsData.graft_price).toFixed(2)}
                </Text>
                <Text>
                  <strong>Technique:</strong> {statsData.technique}
                </Text>
                <Text>
                  <strong>PRP:</strong> {statsData.prp}
                </Text>
                <Text>
                  <strong>Amount paid:</strong> {Number(statsData.amount_paid).toFixed(2)}
                </Text>
                <Text>
                  <strong>Pending Amount:</strong> {Number(statsData.pending_amount).toFixed(2)}
                </Text>
                <Text>
                  <strong>With GST Amount:</strong> {statsData.with_gst_amount}
                </Text>
                <Text>
                  <strong>Without GST Amount:</strong>{" "}
                  {statsData.without_gst_amount}
                </Text>
              </>
            ) : null}
            <Text>
              <strong>Note:</strong> {statsData.note}
            </Text>
            {statsData.type === "Consultation" ? (
              <>
                <Text>
                  <strong>Time:</strong> {statsData.slot}
                </Text>
                <Text>
                  <strong>Payment Type:</strong> {statsData.payment}
                </Text>
              </>
            ) : null}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Grid>
  );
};
// export default AppointmentApp;
