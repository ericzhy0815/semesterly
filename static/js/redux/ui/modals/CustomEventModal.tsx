/*
Copyright (C) 2017 Semester.ly Technologies, LLC

Semester.ly is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Semester.ly is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.
*/

// @ts-ignore
import { HexColorPicker } from "react-colorful";
import React, { FormEvent, useEffect, useRef, useState } from "react";
import { updateCustomSlot } from "../../actions";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { customEventsActions } from "../../state/slices/customEventsSlice";
import { DAYS } from "../../constants/constants";
import Modal from "./Modal";
import { selectSlotColorData } from "../../state/slices/themeSlice";

/**
 * This modal pops up when a student clicks on a custom event in their timetable. It
 * allows them to modify the event's day, name, time, location, etc.
 */
const CustomEventModal = () => {
  const [eventDay, setEventDay] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventColor, setEventColor] = useState("");
  const [eventStartTime, setEventStartTime] = useState("");
  const [eventEndTime, setEventEndTime] = useState("");
  const [eventCredits, setEventCredits] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPickingColor, setIsPickingColor] = useState(false);

  const slotColor = useAppSelector(selectSlotColorData);
  const getSelectedEvent = () => {
    const events = useAppSelector((state) => state.customEvents.events);
    const selectedEventId = useAppSelector(
      (state) => state.customEvents.selectedEventId
    );
    return events.find((event) => event.id === selectedEventId);
  };
  const selectedEvent = getSelectedEvent();
  const isVisible = useAppSelector(
    (state) => state.customEvents.isModalVisible && !!selectedEvent
  );

  useEffect(() => {
    if (selectedEvent) {
      setEventDay(selectedEvent.day);
      setEventName(selectedEvent.name);
      setEventLocation(selectedEvent.location);
      setEventColor(selectedEvent.color);
      setEventStartTime(selectedEvent.time_start);
      setEventEndTime(selectedEvent.time_end);
      setEventCredits(`${selectedEvent.credits}`);
    }
  }, [selectedEvent]);

  const dispatch = useAppDispatch();

  const modalHeader = (
    <div className="modal-header">
      <h1>Edit Custom Event</h1>
    </div>
  );

  const createColorButton = (color: string) => (
    <button
      key={color}
      type="button"
      onClick={() => setEventColor(color)}
      style={{ backgroundColor: color }}
    />
  );

  const createDayButton = (day: string, label?: string) => (
    <button
      type="button"
      key={day}
      name={day}
      className={eventDay === day ? "active" : "inactive"}
      onClick={() => setEventDay(day)}
    >
      <span>{label || day}</span>
    </button>
  );

  const createLabel = (name: string, label: string) => (
    <label htmlFor={name}>
      <span>{label}</span>
    </label>
  );

  const createTextInput = (
    name: string,
    value: string,
    setter: (newValue: string) => void,
    validator?: (newValue: string) => boolean,
    messageIfInvalid?: string
  ) => (
    <div className="input-text-field">
      <input
        id={name}
        type="text"
        value={value}
        onChange={(e) => {
          if (validator && !validator(e.target.value)) {
            setErrorMessage(messageIfInvalid || "Invalid input");
          } else {
            setErrorMessage("");
          }
          setter(e.target.value);
        }}
      />
    </div>
  );

  const eventNameValidator = (newValue: string) =>
    newValue ? newValue.length <= 50 : true;
  const eventNameErrorMessage = "Name must be less than or equal to 50 characters";

  const eventLocationValidator = (newValue: string) =>
    newValue ? newValue.length <= 50 : true;
  const eventLocationErrorMessage =
    "Location must be less than or equal to 50 characters";

  const eventColorValidator = (newValue: string) => /^#[0-9A-F]{6}$/i.test(newValue);
  const eventColorErrorMessage = "Color must be a valid hex color";

  const eventTimeValidator = (newValue: string) =>
    /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newValue);
  const eventTimeErrorMessage = "Time must be in the format HH:MM";

  const eventCreditsValidator = (newValue: string) =>
    /^([01]?[0-9](.0|.5)?|20(.0)?)$/.test(newValue);
  const eventCreditsErrorMessage =
    "Credits must be a number between 0 and 20 in increments of 0.5";

  const doesTimeStartBeforeEnd = (startTime: string, endTime: string) => {
    const startHour = parseInt(startTime.split(":")[0], 10);
    const startMinutes = parseInt(startTime.split(":")[1], 10);
    const endHour = parseInt(endTime.split(":")[0], 10);
    const endMinutes = parseInt(endTime.split(":")[1], 10);
    return startHour < endHour || (startHour === endHour && startMinutes < endMinutes);
  };
  const eventStartEndErrorMessage = "Start time must be before end time";

  const checkIsValid = () => {
    if (!eventNameValidator(eventName)) {
      setErrorMessage(eventNameErrorMessage);
      return false;
    }
    if (!eventLocationValidator(eventLocation)) {
      setErrorMessage(eventLocationErrorMessage);
      return false;
    }
    if (!eventColorValidator(eventColor)) {
      setErrorMessage(eventColorErrorMessage);
      return false;
    }
    if (!eventTimeValidator(eventStartTime)) {
      setErrorMessage(eventTimeErrorMessage);
      return false;
    }
    if (!eventTimeValidator(eventEndTime)) {
      setErrorMessage(eventTimeErrorMessage);
      return false;
    }
    if (!doesTimeStartBeforeEnd(eventStartTime, eventEndTime)) {
      setErrorMessage(eventStartEndErrorMessage);
      return false;
    }
    if (!eventCreditsValidator(eventCredits)) {
      setErrorMessage(eventCreditsErrorMessage);
      return false;
    }
    return true;
  };

  const onCustomEventSave = (event: FormEvent) => {
    event.preventDefault();
    if (selectedEvent && checkIsValid()) {
      dispatch(
        updateCustomSlot(
          {
            day: eventDay,
            name: eventName,
            location: eventLocation,
            color: eventColor,
            time_start: eventStartTime,
            time_end: eventEndTime,
            credits: eventCredits,
          },
          selectedEvent.id
        )
      );
      dispatch(customEventsActions.hideCustomEventsModal());
    }
  };

  const eventColorPresets = (
    <div className="event-color-presets">
      <div className="event-color-preset-buttons">
        {slotColor.slice(0, 5).map((data) => createColorButton(data.background))}
      </div>
      <div className="event-color-preset-buttons">
        {slotColor.slice(5, 10).map((data) => createColorButton(data.background))}
      </div>
    </div>
  );

  const eventColorBlock = (
    <button
      className="event-color-block"
      type="button"
      style={{ backgroundColor: eventColor }}
      onClick={() => setIsPickingColor((previous) => !previous)}
    />
  );

  const eventLabels = (
    <div className="event-labels">
      {createLabel("event-days", "Day:")}
      {createLabel("event-name", "Name:")}
      {createLabel("event-location", "Location:")}
      {createLabel("event-color", "Color:")}
      {eventColorPresets}
      {createLabel("event-start-time", "Start Time:")}
      {createLabel("event-end-time", "End Time:")}
      {createLabel("event-credits", "Credits:")}
    </div>
  );

  const showWeekend = useAppSelector((state) => state.preferences.showWeekend);
  const days = showWeekend ? DAYS : DAYS.slice(0, 5);

  const editCustomEventForm = (
    <form className="edit-custom-event-form" onSubmit={onCustomEventSave}>
      <div className="event-form-items">
        {window.innerWidth > 600 ? eventLabels : null}
        <div className="event-text-inputs">
          <div className="event-days">
            {days.map((day) => {
              if (day === "R") {
                return createDayButton(day, "Th");
              } else if (day === "U") {
                return createDayButton(day, "Su");
              }
              return createDayButton(day);
            })}
          </div>
          {createTextInput(
            "event-name",
            eventName,
            setEventName,
            eventNameValidator,
            eventNameErrorMessage
          )}
          {createTextInput(
            "event-location",
            eventLocation,
            setEventLocation,
            eventLocationValidator,
            eventLocationErrorMessage
          )}
          {createTextInput(
            "event-color",
            eventColor,
            setEventColor,
            eventColorValidator,
            eventColorErrorMessage
          )}
          {eventColorBlock}
          {createTextInput(
            "event-start-time",
            eventStartTime,
            setEventStartTime,
            eventTimeValidator,
            eventTimeErrorMessage
          )}
          {createTextInput(
            "event-end-time",
            eventEndTime,
            setEventEndTime,
            eventTimeValidator,
            eventTimeErrorMessage
          )}
          {createTextInput(
            "event-credits",
            eventCredits,
            setEventCredits,
            eventCreditsValidator,
            eventCreditsErrorMessage
          )}
        </div>
      </div>
      <p>{errorMessage}</p>
      <button type="submit" className="btn btn-primary save-button">
        <span>Save</span>
      </button>
    </form>
  );

  const colorPicker = (
    <div className="event-color-picker">
      <HexColorPicker color={eventColor} onChange={setEventColor} />
    </div>
  );

  return (
    <Modal
      visible={isVisible}
      onClose={() => {
        dispatch(customEventsActions.hideCustomEventsModal());
      }}
      customStyles={{
        width: "100%",
        height: "min-content",
        maxWidth: "600px",
      }}
    >
      {modalHeader}
      {editCustomEventForm}
      {isPickingColor && colorPicker}
    </Modal>
  );
};

export default CustomEventModal;
