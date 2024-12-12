import React, { useState, useImperativeHandle, forwardRef, useEffect, useRef } from 'react';
import axios from 'axios';
import AddServiceForm from './bookingRoom/addServiceForm'; // Import AddServiceForm
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Form, Alert, Table } from 'react-bootstrap'; // Import React Bootstrap components
import { format } from 'date-fns';
import './UpdateAndRefund.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BASE_URL } from "../utils/config";

const UpdateAndRefund = forwardRef(({ bookingId }, ref) => {
    const [orderRooms, setOrderRooms] = useState([]);
    const [orderServices, setOrderServices] = useState([]);
    const [location, setLocation] = useState({});
    const [isUpdating, setIsUpdating] = useState(false);
    const [Agency, setAgency] = useState({});
    const [expandedNotes, setExpandedNotes] = useState({}); // Trạng thái để lưu ghi chú được mở rộng
    const addServiceRef = useRef(null);
    const [newBookingPrice, setNewBookingPrice] = useState(0);
    const [note, setNote] = useState(orderRooms[0]?.bookingId?.note || '');
    const [updatedQuantities, setUpdatedQuantities] = useState({});
    const [Rooms, setRooms] = useState([]);
    const [refundTimeOut, setRefundTimeOut] = useState(true)

    const navigate = useNavigate();
    useEffect(() => {
        setNote(orderRooms[0]?.bookingId?.note || '');
    }, [orderRooms]);

    useEffect(() => {
        const checkRefundTimeOut = () => {
            const checkinDate = new Date(orderRooms[0]?.bookingId?.checkin);
            checkinDate.setHours(0, 0, 0, 0)
            const currentDate = new Date();
            currentDate.setHours(0, 0, 0, 0)
            const daysBeforeCheckin = Math.floor((checkinDate - currentDate) / (1000 * 3600 * 24));

            if (daysBeforeCheckin >= 2) {

                setRefundTimeOut(true); // Được hoàn tiền nếu còn ít nhất 2 ngày trước ngày checkin
            } else {

                setRefundTimeOut(false); // Không được hoàn tiền nếu ít hơn 2 ngày trước ngày checkin
            }
        };

        if (orderRooms.length > 0) { // Kiểm tra orderRooms không rỗng
            checkRefundTimeOut();
        }
    }, [orderRooms]);
    // Lấy thông tin đặt phòng
    const fetchBookingDetails = async () => {
        try {
            const [orderRoomsResponse, orderServiceResponse, roomsResponse] = await Promise.all([
                axios.get(`${BASE_URL}/orderRooms/booking/${bookingId}`),
                axios.get(`${BASE_URL}/orderServices/booking/${bookingId}`),
                axios.get(`${BASE_URL}/rooms/booking/${bookingId}`)
            ]);
            setOrderRooms(orderRoomsResponse.data);
            setOrderServices(orderServiceResponse.data);
            setRooms(roomsResponse.data.rooms);
        } catch (error) {
            console.error('Error fetching booking details:', error);
        }
    };

    // Lấy thông tin vị trí từ ID phòng
    const fetchLocationAndAgency = async (roomCateId, customerId) => {
        try {
            const locationsResponse = await axios.get(`${BASE_URL}/roomCategories/${roomCateId}`);
            setLocation(locationsResponse.data.locationId);
            const AgencyResponse = await axios.get(`${BASE_URL}/agencies/customer/${customerId}`);
            setAgency(AgencyResponse.data);
        } catch (error) {
            console.error('Error fetching location or agencies details:', error);
        }
    };

    // Gọi API khi trang được tải
    useEffect(() => {
        fetchBookingDetails();
    }, [bookingId]);

    // Cập nhật vị trí khi có thay đổi về phòng
    useEffect(() => {
        if (orderRooms.length > 0) {
            const { roomCateId, customerId } = orderRooms[0];
            if (roomCateId) {
                fetchLocationAndAgency(roomCateId._id, customerId._id);
            }
        }
    }, [orderRooms]);

    // Hàm xử lý khi click vào nút "Xem thêm"
    const toggleNote = (id) => {
        setExpandedNotes((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    };

    // Hàm để hiển thị nội dung ghi chú
    const renderNote = (note, id) => {
        if (!note) return 'N/A';
        const isExpanded = expandedNotes[id];
        const shortNote = note.length > 100 ? `${note.substring(0, 100)}...` : note;
        return (
            <>
                {isExpanded ? note : shortNote}
                {note.length > 100 && (
                    <button
                        onClick={() => toggleNote(id)}
                        style={{
                            marginLeft: '10px',
                            background: 'none',
                            border: 'none',
                            color: '#007bff',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                        }}
                    >
                        {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                    </button>
                )}
            </>
        );
    };
    // Handler for service total changes
    const handleServiceTotalChange = (total) => {
        setNewBookingPrice(total + orderRooms[0].bookingId?.price || 0);
    };
    // Hàm cập nhật thông tin dịch vụ và giá booking
    const handleUpdateBooking = async () => {
        setIsUpdating(true);
        try {
            const createService = await addServiceRef.current.addService(bookingId);
            if (createService) {
                const updatedBookingData = {
                    price: newBookingPrice || orderRooms[0].bookingId.price, // Cập nhật giá nếu có thay đổi
                };
                if (updatedBookingData.price !== orderRooms[0].bookingId.price) {
                    // Cập nhật giá booking và dịch vụ
                    await axios.put(`${BASE_URL}/bookings/${bookingId}`, updatedBookingData);


                    await axios.post(`${BASE_URL}/histories/BE`, { bookingId: bookingId, staffId: null, note: 'khách đã thêm dịch vụ' });
                    const newNotification = { content: `${bookingId} khách đã thêm dịch vụ`, locationId: location };
                    axios
                        .post(`${BASE_URL}/chats/send`, newNotification)
                        .then((response) => {
                            console.log(response.data);
                        })
                        .catch((error) => {
                            console.error(error);
                        });

                    toast.success('Thông tin dịch vụ và giá đơn đã được cập nhật.', {
                        position: "top-right",
                    });
                    fetchBookingDetails();
                } else {
                    toast.error('Vui lòng thêm dịch vụ.', {
                        position: "top-right",
                    });
                }

            } else {
                toast.error('Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.', {
                    position: "top-right",
                });
            }
        } catch (error) {
            console.error('Error updating booking data:', error);
            toast.error('Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.', {
                position: "top-right",
            });
        } finally {
            setIsUpdating(false);
        }
    };
    // Xử lý hoàn trả
    const handleRefund = async () => {

        const checkinDate = new Date(orderRooms[0].bookingId.checkin);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0)
        checkinDate.setHours(0, 0, 0, 0)

        const daysBeforeCheckin = Math.floor((checkinDate - currentDate) / (1000 * 3600 * 24));
        if (daysBeforeCheckin >= 2) {
            if (window.confirm('Bạn có chắc muốn hủy dịch đơn này không?')) {
                setIsUpdating(true);
                try {
                    await axios.put(`${BASE_URL}/bookings/${bookingId}`, { status: 'Yêu cầu hoàn tiền' });

                    // Cập nhật trạng thái booking
                    setOrderRooms((prevOrderRooms) =>
                        prevOrderRooms.map((orderRoom) => ({
                            ...orderRoom,
                            bookingId: { ...orderRoom.bookingId, status: 'Yêu cầu hoàn tiền' },
                        }))
                    );
                    await axios.post(`${BASE_URL}/histories/BE`, { bookingId: bookingId, staffId: null, note: 'khách đã yêu cầu hủy phòng, hoàn tiền' });
                    const newNotification = { content: `${bookingId} khách đã yêu cầu hủy phòng, hoàn tiền`, locationId: location };
                    axios
                        .post(`${BASE_URL}/chats/send`, newNotification)
                        .then((response) => {
                            console.log(response.data);
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                    toast.success('Yêu cầu hủy phòng , hoàn tiền thành công', {
                        position: "top-right",
                    });
                } catch (error) {
                    console.error('Error updating booking status:', error);
                    toast.error('Có lỗi xảy ra khi hủy. Vui lòng thử lại.', {
                        position: "top-right",
                    });

                } finally {
                    setIsUpdating(false);
                }
            }
        } else {
            toast.error('Đơn chỉ có thể hủy trước 2 ngày.', {
                position: "top-right",
            });
        }
    };
    // // Xử lý check-out
    // const handleCheckout = async () => {
    //     setIsUpdating(true);
    //     try {
    //         await axios.put(`http://localhost:9999/bookings/${bookingId}`, { status: 'Đã hoàn thành' });
    //         for (const room of Rooms) {
    //             // Gửi yêu cầu PUT để cập nhật trạng thái
    //             await axios.put(`http://localhost:9999/rooms/${room._id}`, { status: 'Trống', bookingId: null });
    //             console.log(`Room ${room.code} updated to 'Trống'`);
    //         }
    //         console.log('Tất cả các phòng đã được cập nhật thành công!');
    //         // Cập nhật trạng thái booking
    //         setOrderRooms((prevOrderRooms) =>
    //             prevOrderRooms.map((orderRoom) => ({
    //                 ...orderRoom,
    //                 bookingId: { ...orderRoom.bookingId, status: 'Đã hoàn thành' },
    //             }))
    //         );
    //         toast.success('Check out thành Công', {
    //             position: "top-right",
    //         });

    //     } catch (error) {
    //         console.error('Error updating booking status:', error);
    //         toast.error('Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.', {
    //             position: "top-right",
    //         });
    //     } finally {
    //         setIsUpdating(false);
    //     }
    // };

    if (orderRooms.length === 0) {
        return <div>Loading...</div>;
    }

    // Xử lý hủy
    const handleCancelService = async (deleteService, price) => {
        const checkinDate = new Date(deleteService?.time);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0)
        checkinDate.setHours(0, 0, 0, 0)

        const daysBeforeCheckin = Math.floor((checkinDate - currentDate) / (1000 * 3600 * 24));
        // Kiểm tra nếu dịch vụ được hủy trước ngày check-in 2 ngày
        if (daysBeforeCheckin >= 2) {
            if (window.confirm('Bạn có chắc muốn hủy dịch vụ này không?')) {
                setIsUpdating(true);
                // Xóa dịch vụ khỏi danh sách
                const updatedServices = orderServices.filter((service) => service._id !== deleteService._id);
                setOrderServices(updatedServices); // Cập nhật lại danh sách dịch vụ đã đặt

                // Cập nhật lại giá booking sau khi xóa dịch vụ
                setNewBookingPrice((prevPrice) => prevPrice - price);

                // Gửi yêu cầu xóa dịch vụ từ cơ sở dữ liệu
                try {
                    // Cập nhật lại booking với dịch vụ đã xóa
                    const updatedBookingData = {
                        price: orderRooms[0].bookingId.price - price || newBookingPrice,
                    };
                    await axios.put(`${BASE_URL}/bookings/${bookingId}`, updatedBookingData);
                    await axios.delete(`${BASE_URL}/orderServices/${deleteService._id}`);
                    await axios.post(`${BASE_URL}/histories/BE`, { bookingId: bookingId, staffId: null, note: 'khách đã xóa dịch vụ' });

                    const newNotification = { content: `${bookingId} khách đã xóa dịch vụ`, locationId: location };

                    axios
                        .post(`${BASE_URL}/chats/send`, newNotification)
                        .then((response) => {
                            console.log(response.data);
                        })
                        .catch((error) => {
                            console.error(error);
                        });

                    fetchBookingDetails(); // Tải lại thông tin booking sau khi cập nhật
                    toast.success('Dịch vụ đã được xóa thành công và giá đơn đã được cập nhật.', {
                        position: "top-right",
                    });

                } catch (error) {
                    console.error('Error canceling service:', error);
                    toast.error('Có lỗi xảy ra khi cập nhật thông tin. Vui lòng thử lại.', {
                        position: "top-right",
                    });
                } finally {
                    setIsUpdating(false);
                }
            }
        } else {
            toast.error('Dịch vụ chỉ có thể hủy trước ngày sử dụng dịch vụ 2 ngày.', {
                position: "top-right",
            });
        }
    };

    const handleDeleteOrderRoom = async (OrderRoom) => {

        const checkinDate = new Date(OrderRoom.receiveRoom);
        const checkinBooking = new Date(OrderRoom.bookingId?.checkin);
        const checkoutDate = new Date(OrderRoom.returnRoom);
        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0)
        checkinDate.setHours(0, 0, 0, 0)
        checkoutDate.setHours(0, 0, 0, 0)
        checkinBooking.setHours(0, 0, 0, 0)
        const daysBeforeCheckin = Math.floor((checkinBooking - currentDate) / (1000 * 3600 * 24));
        const night = Math.floor((checkoutDate - checkinDate) / (1000 * 3600 * 24));

        const price = OrderRoom.roomCateId.price * OrderRoom.quantity * night;

        // Kiểm tra nếu phòng được hủy trước ngày check-in 2 ngày
        if (daysBeforeCheckin >= 2 && orderRooms.length > 1) {
            if (window.confirm('Bạn có chắc muốn hủy phòng này không?')) {
                setIsUpdating(true);
                // Xóa phòng khỏi danh sách
                const updatedRooms = orderRooms.filter((room) => room._id !== OrderRoom._id);
                setOrderRooms(updatedRooms); // Cập nhật lại danh sách phòng đã đặt

                // Cập nhật lại giá booking sau khi xóa phòng
                setNewBookingPrice((prevPrice) => prevPrice - price);

                // Gửi yêu cầu xóa phòng từ cơ sở dữ liệu
                try {
                    // Cập nhật lại booking với Room đã xóa
                    const updatedBookingData = {
                        price: OrderRoom.bookingId.price - price || newBookingPrice,
                    };
                    await axios.put(`${BASE_URL}/bookings/${bookingId}`, updatedBookingData);

                    // Gửi yêu cầu API để hủy phòng
                    await axios.delete(`${BASE_URL}/orderRooms/${OrderRoom._id}`)
                    await axios.post(`${BASE_URL}/histories/BE`, { bookingId: bookingId, staffId: null, note: 'khách đã hủy loại phòng' });

                    const newNotification = { content: `${bookingId} khách đã hủy loại phòng`, locationId: location };
                    axios
                        .post(`${BASE_URL}/chats/send`, newNotification)
                        .then((response) => {
                            console.log(response.data);
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                    fetchBookingDetails(); // Tải lại thông tin booking sau khi cập nhật
                    toast.success('Phòng  đã được xóa thành công và giá booking đã được cập nhật.', {
                        position: "top-right",
                    });

                } catch (error) {
                    console.error('Lỗi khi hủy phòng:', error);
                    toast.error('Không thể hủy phòng. Vui lòng thử lại.', {
                        position: "top-right",
                    });
                } finally {
                    setIsUpdating(false);
                }
            };
        } else {
            if (orderRooms.length === 1) {
                toast.error('Phòng chỉ có thể xóa Khi còn trên 1 loại phòng.', {
                    position: "top-right",
                });
            }
            else {
                toast.error('Phòng chỉ có thể xóa trước ngày check in 2 ngày.', {
                    position: "top-right",
                });
            };
        }
    }


    const handleQuantityChange = (orderRoomId, quantity) => {
        setUpdatedQuantities((prev) => ({
            ...prev,
            [orderRoomId]: Math.max(1, Number(quantity)), // Đảm bảo số lượng tối thiểu là 1
        }));
    };

    const handleUpdateRoomAll = async () => {
        setIsUpdating(true);
        try {

            // Cập nhật từng orderRoom với số lượng mới
            for (const [orderRoomId, quantity] of Object.entries(updatedQuantities)) {
                await axios.put(`${BASE_URL}/orderRooms/${orderRoomId}`, { quantity });
            }
            // // Chờ tất cả các update hoàn thành
            // await Promise.all(updatePromises);

            // Tính tổng giá chênh lệch
            // const priceDifference = calculateTotalPrice();

            // Cập nhật giá tổng của booking
            const bookingId = orderRooms[0]?.bookingId?._id;
            // await axios.put(`http://localhost:9999/bookings/${bookingId}`, { price: orderRooms[0].bookingId.price + priceDifference, note: note });
            await axios.put(`${BASE_URL}/bookings/${bookingId}`, { note: note });

            await axios.post(`${BASE_URL}/histories/BE`, { bookingId: bookingId, staffId: null, note: 'khách đã cập nhật thông tin phòng' });

            const newNotification = { content: `${bookingId} khách đã cập nhật thông tin phòng`, locationId: location };
            axios
                .post(`${BASE_URL}/chats/send`, newNotification)
                .then((response) => {
                    console.log(response.data);
                })
                .catch((error) => {
                    console.error(error);
                });

            // Làm mới dữ liệu
            fetchBookingDetails();

            // Reset số lượng đã cập nhật
            setUpdatedQuantities({});
            toast.success('Cập nhật số lượng phòng , ghi chú và giá thành công.', {
                position: "top-right",
            });
        } catch (error) {
            console.error('Lỗi khi cập nhật:', error);
            toast.error('Có lỗi xảy ra. Vui lòng thử lại.', {
                position: "top-right",
            });

        }
        finally {
            setIsUpdating(false);
        }
    };


    const handleBackToHome = () => {
        navigate('/')
    };

    // const calculateTotalPrice = () => {
    //     // Lấy giá cũ của tất cả orderRooms (tính theo từng phòng)
    //     const oldPrice = orderRooms.reduce((total, orderRoom) => {
    //         const roomPrice = orderRoom.roomCateId?.price || 0;
    //         const quantity = orderRoom.quantity;

    //         const receiveDate = new Date(orderRoom.receiveRoom);
    //         const returnDate = new Date(orderRoom.returnRoom);
    //         const numberOfNights = Math.max(1, Math.ceil((returnDate - receiveDate) / (1000 * 60 * 60 * 24)));

    //         return total + roomPrice * quantity * numberOfNights;
    //     }, 0);

    //     // Tính giá mới từ số lượng phòng đã được cập nhật
    //     const newPrice = orderRooms.reduce((total, orderRoom) => {
    //         const roomPrice = orderRoom.roomCateId?.price || 0;
    //         const quantity = updatedQuantities[orderRoom._id] ?? orderRoom.quantity;

    //         const receiveDate = new Date(orderRoom.receiveRoom);
    //         const returnDate = new Date(orderRoom.returnRoom);
    //         const numberOfNights = Math.max(1, Math.ceil((returnDate - receiveDate) / (1000 * 60 * 60 * 24)));

    //         return total + roomPrice * quantity * numberOfNights;
    //     }, 0);

    //     // Tính chênh lệch giữa giá cũ và giá mới
    //     const priceDifference = newPrice - oldPrice;

    //     return priceDifference; // Trả về chênh lệch giá
    // };
    // const sendNotification = () => {
    //     const newNotification = { content: "New notification from React!" };
    //     axios
    //         .post("http://localhost:9999/chats/send", newNotification)
    //         .then((response) => {
    //             console.log(response.data);
    //         })
    //         .catch((error) => {
    //             console.error(error);
    //         });

    // };

    return (
        <div >
            <ToastContainer />
            <section className="room-details">
                <h3>Thông tin Phòng {!refundTimeOut && <span className='text-danger'>Đã hết thời gian hủy đơn và cập nhật phòng</span>} </h3>

                <h3>Mã Đặt phòng: {orderRooms[0].bookingId?._id || 'N/A'} - Mã hợp đồng: {orderRooms[0].bookingId?.contract || 'N/A'}</h3>
                <Row className="customer-info">
                    <Col>
                        <p><strong>Họ và tên:</strong> {orderRooms[0].customerId?.fullname || 'N/A'}</p>
                        <p><strong>Email:</strong> {orderRooms[0].customerId?.email || 'N/A'}</p>
                        <p><strong>Số điện thoại:</strong> {orderRooms[0].customerId?.phone || 'N/A'}</p>
                        <p><strong>Check-in:</strong> {format(new Date(orderRooms[0].bookingId?.checkin), 'dd-MM-yyyy')}</p>
                        <p><strong>Check-out:</strong> {format(new Date(orderRooms[0].bookingId?.checkout), 'dd-MM-yyyy')}</p>
                    </Col>
                    {/* Hiển thị thông tin Agency */}
                    {Agency && (
                        <Col className="agency-details">
                            <p><strong>Mã đơn vị:</strong> {Agency.code}</p>
                            <p><strong>Tên đơn vị:</strong> {Agency.name}</p>
                            <p><strong>SĐT đơn vị:</strong> {Agency.phone}</p>
                            <p><strong>Vị trí đơn vị:</strong> {Agency.address}</p>
                            <p><strong>Bank + STK:</strong> {Agency.stk}</p>
                        </Col>
                    )}
                    <Col>
                        <p><strong>Ngày tạo đơn:</strong> {format(new Date(orderRooms[0].createdAt), 'dd-MM-yyyy')}</p>
                        <p><strong>Tổng giá:</strong> {orderRooms[0].bookingId?.price ? `${orderRooms[0].bookingId.price} VND` : 'N/A'}</p>
                        <p><strong>Trạng thái:</strong> {orderRooms[0].bookingId?.status || 'N/A'}</p>
                        <p><strong>Đã thanh toán:</strong> {orderRooms[0].bookingId?.payment || 0}</p>
                        <p><strong>Còn nợ:</strong> {orderRooms[0].bookingId?.price - orderRooms[0].bookingId?.payment || 0}</p>
                    </Col>

                </Row>
                <table>
                    <thead>
                        <tr>
                            <th>Tên phòng</th>
                            <th>Giá (VND)</th>
                            <th>Vị trí</th>
                            <th>Số lượng</th>
                            <th>Thời gian</th>
                            {Agency && orderRooms[0]?.bookingId?.status === 'Đã đặt' && <th>Thao tác</th>} {/* Chỉ hiển thị cột này nếu có Agency */}
                        </tr>
                    </thead>

                    <tbody>
                        {orderRooms.map((orderRoom) => (
                            <tr key={orderRoom._id}>
                                <td>{orderRoom.roomCateId?.name || 'N/A'}</td>
                                <td>{orderRoom.roomCateId?.price ? `${orderRoom.roomCateId.price} VND` : 'N/A'}</td>
                                <td>{location?.name || 'N/A'}</td>
                                <td>
                                    {/* {Agency && orderRooms[0]?.bookingId?.status === 'Đã đặt' ? (
                                        <input
                                            type="number"
                                            min="1"
                                            value={updatedQuantities[orderRoom._id] ?? orderRoom.quantity}
                                            onChange={(e) => handleQuantityChange(orderRoom._id, e.target.value)}
                                        />
                                    ) : ( */}
                                    {orderRoom.quantity || 'N/A'}
                                    {/* )} */}
                                </td>
                                <td>
                                    {orderRoom?.receiveRoom
                                        ? format(new Date(orderRoom.receiveRoom), 'dd-MM-yyyy')
                                        : 'N/A'}{' '}
                                    {' => '}
                                    {orderRoom?.returnRoom
                                        ? format(new Date(orderRoom.returnRoom), 'dd-MM-yyyy')
                                        : 'N/A'}
                                </td>
                                {Agency && orderRooms[0]?.bookingId?.status === 'Đã đặt' && (
                                    <td>
                                        <button
                                            disabled={isUpdating}
                                            onClick={() => handleDeleteOrderRoom(orderRoom)}>{isUpdating ? 'Đang cập nhật...' : 'Xóa'}</button>
                                    </td>
                                )}
                            </tr>
                        ))}

                    </tbody>
                </table>
                {/* <h3>Tổng giá: {calculateTotalPrice().toLocaleString()} VND</h3> */}

            </section>

            <section className="booking-info" >
                <p className='border rounded p-2'><strong>Ghi chú:</strong> {renderNote(orderRooms[0].bookingId?.note) || 'N/A'}</p>
            </section>

            {orderRooms[0]?.bookingId?.status === 'Đã check-in' &&
                <Row>
                    {Rooms.map((room) => (
                        <Col md={2} key={room._id} >
                            <Card>
                                <Card.Body>
                                    <Card.Title>{room.roomCategoryId?.name || 'N/A'}</Card.Title>
                                    <Card.Text>
                                        <strong>Số phòng:</strong> {room?.code || 'N/A'}
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>}

            {(Agency && orderRooms[0]?.bookingId?.status === 'Đã đặt' && refundTimeOut) &&
                <section>
                    {/* Note Input Field */}
                    <Row>
                        <Col className='border rounded p-2'>
                            <Form.Group controlId="note">
                                <Form.Label><strong>Cập nhật ghi chú đặt phòng </strong></Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    placeholder="Nhập ghi chú (nếu có)"
                                    name="note"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)} // Update state
                                    maxLength={700} // Limit to 700 characters
                                />
                                <Form.Text className="text-muted">
                                    {note.length}/700 ký tự
                                </Form.Text>
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Create Order Button */}
                    <Button
                        variant="success"
                        onClick={handleUpdateRoomAll}
                        disabled={isUpdating}
                    >
                        {isUpdating ? 'Đang cập nhật...' : 'Cập nhật ghi chú'}
                    </Button>
                </section>}

            <section className="service-details">
                <h3>Dịch vụ Đã đặt</h3>
                {orderServices.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Tên dịch vụ</th>
                                <th>Giá (VND)</th>
                                <th>Số lượng</th>
                                <th>Ngày sử dụng</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orderServices.map((service) => (
                                <React.Fragment key={service._id}>
                                    <tr>
                                        <td>{service?.otherServiceId.name || "N/A"}</td>
                                        <td>{service.otherServiceId?.price || "N/A"}</td>
                                        <td>{service?.quantity || "N/A"}</td>
                                        <td>
                                            {(() => {
                                                const date = service.time;
                                                const formattedDate = date.replace('T', ',').split('.')[0]; // Loại bỏ phần milliseconds và thay T bằng ,
                                                const [datePart, timePart] = formattedDate.split(',');
                                                const [year, month, day] = datePart.split('-');
                                                return `${day}-${month}-${year}, ${timePart.slice(0, 5)}`; // Cắt giờ phút từ timePart
                                            })()}
                                        </td>

                                        <td>
                                            <Button
                                                variant="danger"
                                                disabled={isUpdating || service.status !== "Đã đặt" || (orderRooms[0].bookingId?.status !== 'Đã check-in' && orderRooms[0].bookingId?.status !== 'Đã đặt')}
                                                onClick={() => handleCancelService(service, (service.otherServiceId.price * service.quantity))}
                                            >
                                                {isUpdating ? 'Đang cập nhật...' : 'Hủy Dịch Vụ'}
                                            </Button>
                                        </td>
                                    </tr>
                                    <tr >
                                        <td colSpan="5" >
                                            <strong>Ghi chú:</strong> {renderNote(service?.note, service._id)}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <h3 className='text-success'>Khách hàng chưa đặt dịch vụ nào.</h3>
                )}
            </section>
            {/* Service Form */}
            {(orderRooms[0].bookingId?.status === 'Đã check-in' || orderRooms[0].bookingId?.status === 'Đã đặt') && (
                <div>
                    <AddServiceForm
                        ref={addServiceRef}
                        bookingId={bookingId} // Pass booking ID after it's created
                        onServiceTotalChange={handleServiceTotalChange} // Callback for service total
                        canUpdate={true}
                        bookingCheckIn={orderRooms[0].bookingId.checkin}
                        bookingCheckOut={orderRooms[0].bookingId.checkout}
                    />
                    <Button onClick={handleUpdateBooking}
                        variant="success"
                        disabled={isUpdating || (orderRooms[0].bookingId?.status !== 'Đã check-in' && orderRooms[0].bookingId?.status !== 'Đã đặt')}

                    >
                        {isUpdating ? 'Đang cập nhật...' : 'Cập nhật Dịch vụ'}
                    </Button>
                </div>


            )}
            {/* <h3>Tổng giá tiền thay đổi thành: {newBookingPrice}</h3> */}
            <div className="checkout-button d-flex">
                <button
                    className='bg-warning'
                    onClick={handleBackToHome}
                    disabled={isUpdating}
                >
                    Về Trang Chủ
                </button>

                {!Agency && <button
                    className='bg-danger'
                    onClick={handleRefund}
                    disabled={isUpdating || !refundTimeOut || orderRooms[0].bookingId?.status !== 'Đã đặt'}

                >
                    {isUpdating ? 'Đang cập nhật...' : 'Xác nhận Hủy Đơn'}
                </button>}


            </div>
        </div>
    );
});


export default UpdateAndRefund;
