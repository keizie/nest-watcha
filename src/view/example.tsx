import React from 'react';
import { useState, useEffect } from 'react';
// @ts-ignore
import { render, Text } from 'ink';
import * as Gradient from 'ink-gradient';
import * as BigText from 'ink-big-text';

const Counter = () => {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter((previousCounter) => previousCounter + 1);
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <Text color="green">
      {counter} tests passed
      <Gradient name="summer">
        <BigText text="crypto cli" align="center" font="chrome" />
      </Gradient>
    </Text>
  );
};

export const r = () => {
  render(<Counter />);
  // render(
  //   <Gradient name="rainbow">
  //     <BigText text="unicorns" />
  //   </Gradient>,
  // );
};
