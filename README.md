# AI-Network-Traffic-Analysis
# 🛡️ AI Network Traffic Analysis

### Intelligent Network Monitoring & Machine Learning-Based Intrusion Detection

[![Python](https://img.shields.io/badge/Python-3.13-blue?logo=python)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![XGBoost](https://img.shields.io/badge/ML-XGBoost-orange)](https://xgboost.readthedocs.io/)
[![Scikit-learn](https://img.shields.io/badge/ML-Scikit--learn-F7931E?logo=scikitlearn)](https://scikit-learn.org/)
[![Scapy](https://img.shields.io/badge/Network-Scapy-green)](https://scapy.net/)

**AI Network Traffic Analysis** is a machine learning-powered cybersecurity platform designed to analyze network traffic, identify suspicious behavior, and detect potential network intrusions.

The system combines network packet analysis, feature engineering, machine learning classification, and an interactive web dashboard to provide insights into network security.

It uses an XGBoost-based detection engine trained on network traffic data to distinguish between benign and potentially malicious activities.

🌐 **Live Demo:** [AI Network Traffic Analysis](https://ai-network-traffic-analysis.vercel.app/)

📂 **GitHub Repository:** [AI-Network-Traffic-Analysis](https://github.com/upendraky/AI-Network-Traffic-Analysis)

---

## 🎯 Project Objectives

- Analyze network traffic to identify suspicious activities.
- Detect malicious network behavior using machine learning.
- Extract meaningful features from network traffic.
- Build an intelligent intrusion detection mechanism.
- Provide network security insights through an interactive dashboard.
- Expose ML predictions through REST APIs.
- Store and manage detection records using PostgreSQL.

## ✨ Key Features

- **Network Traffic Analysis:** Analyze network traffic using packet inspection and traffic datasets.
- **Machine Learning-Based Detection:** Use an optimized XGBoost classifier to identify potentially malicious traffic.
- **Feature Engineering:** Prepare and select relevant features to improve model performance.
- **Feature Selection:** Reduce unnecessary input features and maintain the model's expected feature representation.
- **Threat Classification:** Classify analyzed traffic into benign and malicious categories.
- **REST API:** Use FastAPI to expose machine learning predictions.
- **Database Integration:** Store detection information using PostgreSQL and SQLAlchemy.
- **Interactive Dashboard:** Visualize network traffic analysis and detection results.
- **Model Persistence:** Save and load trained machine learning models using Joblib.

## 🏗️ System Architecture

```text
             NETWORK TRAFFIC
                    |
                    v
          PACKET CAPTURE / DATASET
                    |
                    v
          DATA PREPROCESSING
                    |
                    v
          FEATURE ENGINEERING
                    |
                    v
             FEATURE SELECTION
                    |
                    v
          XGBOOST CLASSIFICATION
                    |
             +------+------+
             |             |
             v             v
          BENIGN        MALICIOUS
             |             |
             +------+------+
                    |
                    v
              FASTAPI BACKEND
                    |
             +------+------+
             |             |
             v             v
         POSTGRESQL     FRONTEND
             |             |
             +------+------+
                    |
                    v
           SECURITY INSIGHTS
```

## 🧠 Machine Learning Pipeline

The machine learning pipeline consists of the following stages:

**1. Data Collection**

Network traffic data is obtained using the CIC-IDS2017 dataset. Scapy is also used for packet-level network analysis.

**2. Data Preprocessing**

- Handle missing and invalid values.
- Remove unnecessary columns.
- Clean column names.
- Transform categorical labels.
- Prepare numerical features.

**3. Feature Engineering**

Extract and prepare meaningful network traffic features for machine learning.

**4. Feature Selection**

Select relevant features to reduce dimensionality and maintain consistency between model training and prediction.

**5. Model Training**

Train an XGBoost classifier using the processed network traffic dataset.

**6. Model Optimization**

Use RandomizedSearchCV to explore hyperparameters and improve model performance.

**7. Model Evaluation**

Evaluate the model using:

- Accuracy
- Precision
- Recall
- F1-Score
- Confusion Matrix
- ROC-AUC

**8. Model Deployment**

Persist the trained model and feature selector using Joblib and integrate them into the FastAPI backend.

## 📊 Dataset

**CIC-IDS2017 – Canadian Institute for Cybersecurity**

Dataset: https://www.unb.ca/cic/datasets/ids-2017.html

The dataset contains benign network traffic and multiple attack scenarios, making it suitable for developing and evaluating intrusion detection systems.

Dataset information from the development pipeline:

| Property | Value |
|---|---|
| Dataset | CIC-IDS2017 |
| Records processed | 225,745 |
| Features | 79 |
| Learning approach | Supervised Machine Learning |
| Primary algorithm | XGBoost |

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Programming Language | Python |
| Machine Learning | XGBoost, Scikit-learn |
| Data Processing | Pandas, NumPy |
| Network Analysis | Scapy |
| Backend | FastAPI, Uvicorn |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Model Persistence | Joblib |
| Frontend | Web Dashboard |
| Deployment | Render, Vercel |
| Development Tools | Git, GitHub, VS Code |

## 📁 Project Structure

```text
AI-Network-Traffic-Analysis/
│
├── app/                     # Backend application
│
├── frontend/                # Frontend application
│
├── data/
│   └── processed/
│       └── ids/             # Processed IDS dataset
│
├── models/                  # Trained ML models
│
├── notebooks/               # Data analysis and experiments
│
├── scripts/                 # Utility and automation scripts
│
├── tests/                   # Project tests
│
├── requirements.txt         # Python dependencies
├── render.yaml              # Render deployment configuration
├── package-lock.json        # Node.js dependency lockfile
├── .python-version          # Python version configuration
└── README.md
```

## ⚙️ Installation & Setup

### Prerequisites

- Python 3.11+
- Node.js and npm
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/upendraky/AI-Network-Traffic-Analysis.git

cd AI-Network-Traffic-Analysis
```

### 2. Create a Python Virtual Environment

```bash
python3 -m venv venv
```

Activate the environment:

**macOS / Linux**

```bash
source venv/bin/activate
```

**Windows**

```bash
venv\Scripts\activate
```

### 3. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the project root and configure the database connection according to your backend configuration.

```env
DATABASE_URL=postgresql://username:password@localhost:5432/sentinel_ids
```

Do not commit database credentials or other secrets to GitHub.

### 5. Configure the Frontend

```bash
cd frontend
npm install
```

Start the frontend using the development command defined in its `package.json`.

### 6. Run the Backend

Start the FastAPI application using the actual application entry point in the `app/` directory.

For example, if the entry point is `app.main:app`:

```bash
uvicorn app.main:app --reload --port 8000
```

API documentation (when the backend is running):

```text
http://localhost:8000/docs
```

> Note: The backend entry-point and frontend scripts should match the actual application configuration in your repository.

## 🔌 Backend API

The FastAPI backend provides the integration layer between the machine learning model, database, and frontend.

Potential API responsibilities include:

| Endpoint | Purpose |
|---|---|
| `/api/health` | Check backend and model health |
| `/predict` | Generate network traffic predictions |
| Detection endpoints | Retrieve stored detection records |

Refer to the running FastAPI Swagger documentation at `/docs` for the actual registered routes and request schemas.

## 📈 Model Evaluation

The project evaluates its classification model using standard machine learning metrics.

A previously recorded development experiment achieved:

| Metric | Result |
|---|---:|
| Test ROC-AUC | 0.999858 |
| Test PR-AUC | 0.990172 |

These are results from a development experiment, not a guarantee of performance on unseen real-world network traffic.

## 🔐 Security Considerations

- Live packet capture may require elevated operating-system permissions.
- Never expose database credentials or API secrets.
- Validate incoming API requests.
- Restrict access to network monitoring interfaces.
- Test detection performance on independent network traffic before operational use.
- This project is intended for defensive network monitoring and research.

## 🚀 Future Improvements

- Real-time network traffic monitoring and classification.
- WebSocket-based live detection notifications.
- Attack-type classification and threat severity scoring.
- Explainable AI integration using SHAP.
- Network traffic anomaly detection.
- Historical traffic analysis and reporting.
- Advanced threat visualization.
- Docker-based deployment and orchestration.
- Integration with SIEM platforms.

## 🎓 Learning Outcomes

Through this project, I explored and implemented concepts involving:

- Machine Learning and Classification
- Network Security and Intrusion Detection
- Network Packet Analysis
- Data Preprocessing and Feature Engineering
- Model Optimization and Evaluation
- REST API Development
- Database Integration
- Full-Stack Application Development
- Machine Learning Model Deployment

## 👨‍💻 Author

**Upendra Kumar Yadav**

Computer Science Engineering | AI/ML & Software Development

- GitHub: https://github.com/upendraky
- Project Repository: https://github.com/upendraky/AI-Network-Traffic-Analysis

---

⭐ If you find this project interesting, consider giving the repository a star!

**Disclaimer:** This project is developed for educational, research, and defensive cybersecurity purposes. Always obtain authorization before monitoring or analyzing network traffic.
