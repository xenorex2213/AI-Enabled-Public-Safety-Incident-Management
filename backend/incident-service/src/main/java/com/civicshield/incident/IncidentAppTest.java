package com.civicshield.incident;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class IncidentAppTest {

	public static void main(String[] args) {
		Dotenv dotenv = Dotenv.configure()
			.directory(System.getProperty("user.dir"))
			.ignoreIfMissing()
			.load();
		dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));
		
		SpringApplication.run(IncidentAppTest.class, args);
	}

}
