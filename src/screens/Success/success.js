import React from 'react';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { BASE_URL } from "../../utils/config";
const PaymentSuccess = () => {
  const { id } = useParams();
  const [message, setMessage] = useState('Processing your payment...');

  useEffect(() => {
    const confirmBooking = async () => {
      try {
        const response = await fetch(`${BASE_URL}/bookings/payment-success/${id}`);
        const result = await response.text();
        setMessage(result);
      } catch (error) {
        console.error("Error confirming booking:", error.message);
        setMessage('<h1>An error occurred while confirming your booking</h1>');
      }
    };

    confirmBooking();
  }, [id]);

  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: message }} />
    </div>
  );
};

export default PaymentSuccess;
