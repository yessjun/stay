FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json을 먼저 복사하여 레이어 캐싱 최적화
COPY package*.json ./

# 의존성 설치
RUN npm install --silent

# 소스코드 복사
COPY . .

# 개발 서버 포트 노출
EXPOSE 3000

# Vite dev 서버를 0.0.0.0에서 실행하여 Docker 컨테이너 외부에서 접근 가능하게 설정
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]