import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { FaFacebook, FaInstagram, FaYoutube } from 'react-icons/fa';
import './header.css';

const Header = () => {
  return (
    <header className="header">
      <Container>
        <Row>
          <Col md={6} className="contact-info">
            {/* thêm href sang 3 cơ sở */}
            <h6>16 Minh Khai | Đồ Sơn | Cát Bà | 022 5374 5766</h6>
          </Col>
          <Col md={6} className="text-md-end">
            <a href="https://www.facebook.com/profile.php?id=61569704205874" target="_blank" rel="noopener noreferrer" className="social-icon">
              <FaFacebook />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="social-icon">
              <FaInstagram />
            </a>
            <a href="#" target="_blank" rel="noopener noreferrer" className="social-icon">
              <FaYoutube />
            </a>
          </Col>
        </Row>
      </Container>
    </header>
  );
};

export default Header;